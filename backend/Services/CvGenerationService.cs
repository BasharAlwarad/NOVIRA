using System.Text.Json;
using Anthropic;
using Anthropic.Models.Messages;
using Novira.Backend.Models;

namespace Novira.Backend.Services;

public record CvGenerationOutcome(
    CvGenerationResult? Result,
    string ConversationJson,
    long InputTokens,
    long OutputTokens,
    decimal EstimatedCostUsd,
    string? Error);

// The Tier 2 CV/cover-letter drafting pipeline (Architecture.md's "Tier 2
// services" step 5 — deliberately the last piece built, once real intake
// and request data existed to build it against). Claude only ever drafts
// structured content (CvDraftContent/CoverLetterDraftContent) — a separate,
// deterministic template (CvPdfRenderer) turns that into the actual PDF, so
// a revision is a reliable content edit, never a layout risk.
//
// No web_search tool, no vision — this is pure text generation from data
// already in our own database (the candidate's intake profile + the target
// Opportunity), so a plain non-streaming call is fine (unlike
// UniversityResearchService's web-search calls, which can genuinely run
// minutes and need streaming to avoid being cut off).
public class CvGenerationService
{
    private readonly AnthropicClient _client;
    private readonly ILogger<CvGenerationService> _logger;

    // Sonnet 5 pricing ($2/$10 per MTok) — same constants/reasoning as
    // UniversityResearchService's own cost-visibility estimate. This task
    // (draft structured text from data we already have) is exactly the
    // "bounded extraction/drafting, not open-ended reasoning" shape that
    // doesn't need Opus-tier capability.
    private const decimal InputCostPerMillionUsd = 2.0m;
    private const decimal OutputCostPerMillionUsd = 10.0m;

    public CvGenerationService(IConfiguration configuration, ILogger<CvGenerationService> logger)
    {
        var apiKey = configuration["Anthropic:ApiKey"];
        _client = string.IsNullOrWhiteSpace(apiKey) ? new AnthropicClient() : new AnthropicClient { ApiKey = apiKey };
        _logger = logger;
    }

    public Task<CvGenerationOutcome> GenerateAsync(string promptText, CancellationToken cancellationToken = default)
    {
        var turns = new List<CvConversationTurn> { new("user", promptText) };
        return RunAsync(turns, cancellationToken);
    }

    // Appends the admin's feedback to the existing conversation (Claude's
    // own prior draft included) and asks for a revision — a real
    // conversational edit, not a from-scratch regeneration, so a request
    // like "shorten the summary" only touches what was actually asked.
    public async Task<CvGenerationOutcome> ReviseAsync(
        string conversationJson, string feedback, CancellationToken cancellationToken = default)
    {
        List<CvConversationTurn> turns;
        try
        {
            turns = JsonSerializer.Deserialize<List<CvConversationTurn>>(conversationJson) ?? [];
        }
        catch (JsonException)
        {
            return new CvGenerationOutcome(null, conversationJson, 0, 0, 0,
                "Could not read the existing draft conversation — try generating from scratch.");
        }

        if (turns.Count == 0)
        {
            return new CvGenerationOutcome(null, conversationJson, 0, 0, 0, "No prior draft to revise.");
        }

        turns.Add(new CvConversationTurn(
            "user",
            $"""
            Please revise the CV and cover letter based on this feedback: {feedback}

            Keep everything else the same unless the feedback implies a broader change. Return the complete, updated CV and cover letter in the same structured format as before — not just the changed parts.
            """));

        return await RunAsync(turns, cancellationToken);
    }

    private async Task<CvGenerationOutcome> RunAsync(List<CvConversationTurn> turns, CancellationToken cancellationToken)
    {
        var messages = turns
            .Select(t => new MessageParam
            {
                Role = t.Role == "assistant" ? Role.Assistant : Role.User,
                Content = new List<ContentBlockParam> { new TextBlockParam { Text = t.Text } },
            })
            .ToList();

        var parameters = new MessageCreateParams
        {
            Model = "claude-sonnet-5",
            MaxTokens = 8000,
            OutputConfig = new OutputConfig
            {
                Format = new JsonOutputFormat { Schema = BuildSchema() },
                Effort = Effort.Medium,
            },
            Messages = messages,
        };

        long inputTokens;
        long outputTokens;
        string? stopReason;
        TextBlock? textBlock;
        try
        {
            var response = await _client.Messages.Create(parameters, cancellationToken: cancellationToken);
            inputTokens = response.Usage.InputTokens;
            outputTokens = response.Usage.OutputTokens;
            stopReason = response.StopReason!;
            textBlock = response.Content.Select(b => b.Value).OfType<TextBlock>().FirstOrDefault();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "CV generation API call failed.");
            return new CvGenerationOutcome(null, SerializeTurns(turns), 0, 0, 0, "The generation call failed — try again.");
        }

        var estimatedCostUsd = (inputTokens / 1_000_000m * InputCostPerMillionUsd)
            + (outputTokens / 1_000_000m * OutputCostPerMillionUsd);
        _logger.LogInformation(
            "CV generation: {InputTokens} input tokens, {OutputTokens} output tokens, ~${EstimatedCostUsd} estimated.",
            inputTokens, outputTokens, estimatedCostUsd);

        if (stopReason == "refusal")
        {
            _logger.LogWarning("CV generation declined by safety classifiers.");
            return new CvGenerationOutcome(null, SerializeTurns(turns), inputTokens, outputTokens, estimatedCostUsd,
                "The model declined to generate this — try rephrasing the request or opportunity details.");
        }

        if (textBlock is null)
        {
            return new CvGenerationOutcome(null, SerializeTurns(turns), inputTokens, outputTokens, estimatedCostUsd,
                "The response contained no usable content.");
        }

        CvGenerationResult? result;
        try
        {
            result = JsonSerializer.Deserialize<CvGenerationResult>(textBlock.Text);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse CV generation JSON.");
            return new CvGenerationOutcome(null, SerializeTurns(turns), inputTokens, outputTokens, estimatedCostUsd,
                "Failed to parse the generated content.");
        }

        turns.Add(new CvConversationTurn("assistant", textBlock.Text));

        return new CvGenerationOutcome(result, SerializeTurns(turns), inputTokens, outputTokens, estimatedCostUsd, null);
    }

    private static string SerializeTurns(List<CvConversationTurn> turns) => JsonSerializer.Serialize(turns);

    // Every "object"-typed node needs additionalProperties: false explicitly
    // set — found live (2026-10-01): a first real generation call failed
    // with a 400 ("For 'object' type, 'additionalProperties' must be
    // explicitly set to false") because the nested experience/education
    // item schemas and the cv/coverLetter sub-objects didn't have it, only
    // the top-level schema did.
    private static Dictionary<string, JsonElement> BuildSchema() => new()
    {
        ["type"] = JsonSerializer.SerializeToElement("object"),
        ["properties"] = JsonSerializer.SerializeToElement(new
        {
            cv = new
            {
                type = "object",
                additionalProperties = false,
                properties = new
                {
                    fullName = new { type = "string" },
                    phone = new { type = "string" },
                    address = new { type = "string" },
                    dateOfBirth = new { type = "string" },
                    summary = new { type = "string", description = "2-4 lines, tailored to the target opportunity." },
                    experience = new
                    {
                        type = "array",
                        items = new
                        {
                            type = "object",
                            additionalProperties = false,
                            properties = new
                            {
                                title = new { type = "string" },
                                employer = new { type = "string" },
                                dateRange = new { type = "string" },
                                bullets = new { type = "array", items = new { type = "string" } },
                            },
                            required = new[] { "title", "employer", "dateRange", "bullets" },
                        },
                    },
                    education = new
                    {
                        type = "array",
                        items = new
                        {
                            type = "object",
                            additionalProperties = false,
                            properties = new
                            {
                                qualification = new { type = "string" },
                                institution = new { type = "string" },
                                dateRange = new { type = "string" },
                            },
                            required = new[] { "qualification", "institution", "dateRange" },
                        },
                    },
                    skills = new { type = "string" },
                    languages = new { type = "string" },
                    certifications = new { type = "string" },
                },
                required = new[] { "fullName", "phone", "address", "dateOfBirth", "summary", "experience", "education", "skills", "languages", "certifications" },
            },
            coverLetter = new
            {
                type = "object",
                additionalProperties = false,
                properties = new
                {
                    recipientLine = new { type = "string", description = "e.g. 'Dear Hiring Team at {provider},'" },
                    paragraphs = new { type = "array", items = new { type = "string" }, description = "3-4 short paragraphs." },
                    closingLine = new { type = "string", description = "e.g. 'Sincerely, {full name}'" },
                },
                required = new[] { "recipientLine", "paragraphs", "closingLine" },
            },
        }),
        ["required"] = JsonSerializer.SerializeToElement(new[] { "cv", "coverLetter" }),
        ["additionalProperties"] = JsonSerializer.SerializeToElement(false),
    };
}
