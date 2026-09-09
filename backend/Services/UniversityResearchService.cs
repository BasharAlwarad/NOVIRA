using System.Text.Json;
using System.Text.Json.Serialization;
using Anthropic;
using Anthropic.Models.Messages;

namespace Novira.Backend.Services;

// AI-assisted University opportunity sourcing — the "Generate University"
// pipeline Matching-Algorithm-Study.md §8 flagged as needing its own
// source-credibility design before it's built (unlike Ausbildung, which
// syncs from a real government API). Built 2026-08-29.
//
// Same anti-fabrication discipline as everywhere else in this app (see
// CLAUDE.md: "the matching/AI layer must only select from and explain this
// verified data — never free-generate institution names or program
// details"). This service never invents a program — it searches real, live
// pages via Claude's web_search tool, constrained to Germany's own official
// program directories, and extracts only what a human can independently
// verify by clicking the same URL. Every result still lands Pending and
// goes through the exact same OpportunitiesAdminEndpoints review as a
// hand-typed entry or an Ausbildung sync row — this service's only job is
// to reduce the founder's own research legwork, never to publish anything
// on its own.
public class UniversityResearchService
{
    private readonly AnthropicClient _client;
    private readonly ILogger<UniversityResearchService> _logger;

    // Germany's own official program directories — see
    // Matching-Algorithm-Study.md §8's acquisition-strategy note ("official
    // university/DAAD/Hochschulkompass pages as trusted, third-party
    // aggregators/agencies never used as a sole source"). Constraining the
    // web_search tool itself to these domains means search RESULTS can only
    // ever come from here — never a random aggregator or agency site — and
    // IsTrustedSourceUrl below re-checks the same policy on the model's
    // final output as defense in depth, the same "don't trust one layer"
    // discipline the rate limiters elsewhere in this app already follow.
    public static readonly string[] TrustedDomains = ["daad.de", "study-in-germany.de", "hochschulkompass.de"];

    public UniversityResearchService(IConfiguration configuration, ILogger<UniversityResearchService> logger)
    {
        var apiKey = configuration["Anthropic:ApiKey"];
        _client = string.IsNullOrWhiteSpace(apiKey) ? new AnthropicClient() : new AnthropicClient { ApiKey = apiKey };
        _logger = logger;
    }

    public static bool IsTrustedSourceUrl(string url) =>
        Uri.TryCreate(url, UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)
        && TrustedDomains.Any(domain =>
            uri.Host.Equals(domain, StringComparison.OrdinalIgnoreCase)
            || uri.Host.EndsWith("." + domain, StringComparison.OrdinalIgnoreCase));

    // One occupation field per call, not one call covering several — the
    // caller passes occupationFieldKey in and writes it onto every
    // resulting Opportunity server-side; the model is never trusted to
    // self-report which of NOVIRA's 110 OccupationField values a program
    // belongs to. A freeform taxonomy string is exactly the kind of fragile
    // model output this app avoids trusting elsewhere (see
    // OccupationFieldMapper.cs's own "drop rather than guess" precedent) —
    // here we just don't ask the model to produce it at all.
    // Sonnet 5 pricing ($2/$10 per MTok) — used only for the rough
    // cost-visibility estimate logged/returned below, never for billing
    // itself. Update if the pricing referenced in the claude-api skill
    // changes.
    private const decimal InputCostPerMillionUsd = 2.0m;
    private const decimal OutputCostPerMillionUsd = 10.0m;

    public async Task<ResearchOutcome> ResearchAsync(
        string occupationFieldKey, string occupationFieldDescription, CancellationToken cancellationToken = default)
    {
        var promptText =
            $"""
            You are researching real, currently offered German university degree programs for NOVIRA, a platform helping people from the Middle East/North Africa region find study pathways to Germany. Search only within daad.de, study-in-germany.de, and hochschulkompass.de (Germany's own official program directories) — do not use any other site, and do not use your own general knowledge to fill in a detail a search doesn't actually confirm.

            Find 1 to 2 real, currently open German university Bachelor's or Master's degree programs relevant to this occupation field: "{occupationFieldDescription}" (internal key: {occupationFieldKey}).

            For each program you find, extract only what the source page actually states — leave a field as an empty string rather than guessing or estimating. sourceUrl must be the exact page URL you found the details on, from one of the three allowed domains. If you cannot find any genuinely relevant, currently open program on those domains, return an empty list — do not stretch a loosely-related result to fill it.
            """;

        // Cost-control knobs (tightened 2026-08-30 after a real run burned
        // through the account's credit balance faster than expected — see
        // CLAUDE.md's cost-reduction entry for the full diagnosis):
        // - Sonnet 5, not Opus 5: this is bounded extraction from a handful
        //   of search results, not reasoning that needs Opus-tier
        //   capability — 2.5x cheaper on both input and output.
        // - MaxUses 3, not 6: caps the worst-case searches per field call.
        // - Effort "medium", not the Opus-5 default (adaptive, high) —
        //   thinking tokens bill as output tokens at the expensive rate;
        //   medium is enough depth for "search 3 trusted pages, extract
        //   fixed fields."
        var parameters = new MessageCreateParams
        {
            Model = "claude-sonnet-5",
            MaxTokens = 8000,
            Tools = [new ToolUnion(new WebSearchTool20260209 { AllowedDomains = TrustedDomains.ToList(), MaxUses = 3 })],
            OutputConfig = new OutputConfig
            {
                Format = new JsonOutputFormat { Schema = BuildSchema() },
                Effort = Effort.Medium,
            },
            Messages = [new() { Role = Role.User, Content = new List<ContentBlockParam> { new TextBlockParam { Text = promptText } } }],
        };

        // Streaming, not a single Create() call — a web-search-enabled
        // request can genuinely take minutes (Anthropic's servers run
        // several searches before producing final text), and a long-held
        // non-streaming HTTP response is prone to being cut off mid-flight.
        // Found live (2026-08-29): 3 of 4 fields in the first real run
        // failed with HttpIOException("The response ended prematurely"),
        // exactly the failure mode the API guidance's "default to streaming
        // for long-running requests" rule exists to prevent. Only "nursing"
        // (the first, presumably fastest, field) completed on the
        // non-streaming version.
        var textBlocksByIndex = new Dictionary<long, System.Text.StringBuilder>();
        string? stopReason = null;
        long inputTokens = 0;
        long outputTokens = 0;

        try
        {
            await foreach (var streamEvent in _client.Messages.CreateStreaming(parameters, cancellationToken: cancellationToken))
            {
                if (streamEvent.TryPickContentBlockStart(out var blockStart) && blockStart.ContentBlock.TryPickText(out _))
                {
                    textBlocksByIndex[blockStart.Index] = new System.Text.StringBuilder();
                }
                else if (streamEvent.TryPickContentBlockDelta(out var contentDelta)
                    && contentDelta.Delta.TryPickText(out var textDelta)
                    && textBlocksByIndex.TryGetValue(contentDelta.Index, out var builder))
                {
                    builder.Append(textDelta.Text);
                }
                else if (streamEvent.TryPickStart(out var start))
                {
                    inputTokens = start.Message.Usage.InputTokens;
                }
                else if (streamEvent.TryPickDelta(out var messageDelta))
                {
                    stopReason = messageDelta.Delta.StopReason!;
                    outputTokens = messageDelta.Usage.OutputTokens;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "University research API call failed for field {Field}.", occupationFieldKey);
            return ResearchOutcome.Empty;
        }

        // Real cost visibility (found missing 2026-08-30: nobody, including
        // this codebase, had ever logged what one of these calls actually
        // cost — see CLAUDE.md). Estimate only, not a billing source of
        // truth; Sonnet 5 pricing per the claude-api skill's cached table.
        var estimatedCostUsd = (inputTokens / 1_000_000m * InputCostPerMillionUsd)
            + (outputTokens / 1_000_000m * OutputCostPerMillionUsd);
        _logger.LogInformation(
            "University research for {Field}: {InputTokens} input tokens, {OutputTokens} output tokens, ~${EstimatedCostUsd} estimated.",
            occupationFieldKey, inputTokens, outputTokens, estimatedCostUsd);

        if (stopReason == "refusal")
        {
            _logger.LogWarning("University research declined by safety classifiers for field {Field}.", occupationFieldKey);
            return new ResearchOutcome([], inputTokens, outputTokens, estimatedCostUsd);
        }

        // Same "take the last text block" intent as the non-streaming
        // version (DocumentVerificationService's own pattern) — the
        // structured-output JSON is expected to be the final text block.
        var text = textBlocksByIndex.OrderBy(kv => kv.Key).LastOrDefault().Value?.ToString();
        if (string.IsNullOrWhiteSpace(text))
        {
            _logger.LogWarning(
                "University research response for {Field} contained no text content (stop reason: {StopReason}).",
                occupationFieldKey, stopReason);
            return new ResearchOutcome([], inputTokens, outputTokens, estimatedCostUsd);
        }

        ResearchResult? result;
        try
        {
            result = JsonSerializer.Deserialize<ResearchResult>(text);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse university research JSON for field {Field}.", occupationFieldKey);
            return new ResearchOutcome([], inputTokens, outputTokens, estimatedCostUsd);
        }

        if (result is null)
        {
            return new ResearchOutcome([], inputTokens, outputTokens, estimatedCostUsd);
        }

        // Defense in depth: even though the search tool itself is
        // constrained to TrustedDomains, re-validate every returned
        // sourceUrl before it's ever eligible to reach the DB — a model
        // could in principle cite a URL it never actually fetched.
        var candidates = result.ProgramsFound
            .Where(p => !string.IsNullOrWhiteSpace(p.Title)
                && !string.IsNullOrWhiteSpace(p.Provider)
                && !string.IsNullOrWhiteSpace(p.SourceUrl)
                && IsTrustedSourceUrl(p.SourceUrl))
            .Select(p => new UniversityProgramCandidate(
                p.Title.Trim(), p.Provider.Trim(), NullIfEmpty(p.Location), NullIfEmpty(p.Description), p.SourceUrl,
                NullIfEmpty(p.RequiredGermanLevel), NullIfEmpty(p.RequiredEnglishLevel),
                p.RequiresCertifiedLanguageProof, NullIfEmpty(p.MinEducationLevel),
                NullIfEmpty(p.TuitionFeeEurText), NullIfEmpty(p.ApplicationDeadlineIso)))
            .ToList();

        return new ResearchOutcome(candidates, inputTokens, outputTokens, estimatedCostUsd);
    }

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value;

    private static Dictionary<string, JsonElement> BuildSchema() => new()
    {
        ["type"] = JsonSerializer.SerializeToElement("object"),
        ["properties"] = JsonSerializer.SerializeToElement(new
        {
            programsFound = new
            {
                type = "array",
                items = new
                {
                    type = "object",
                    properties = new
                    {
                        title = new { type = "string", description = "The program's official title, e.g. 'B.Sc. Nursing'." },
                        provider = new { type = "string", description = "The institution's official name." },
                        location = new { type = "string", description = "City the program is offered in, empty string if not stated." },
                        description = new { type = "string", description = "One or two factual sentences describing the program, based only on what the source page states." },
                        sourceUrl = new { type = "string", description = "The exact page URL (on daad.de, study-in-germany.de, or hochschulkompass.de) where these details were found." },
                        requiredGermanLevel = new
                        {
                            type = "string",
                            @enum = new[] { "None", "A1", "A2", "B1", "B2", "C1", "C1Plus", "" },
                            description = "Required German language level (CEFR), empty string if not stated or not required.",
                        },
                        requiredEnglishLevel = new
                        {
                            type = "string",
                            @enum = new[] { "None", "A1", "A2", "B1", "B2", "C1", "C1Plus", "" },
                            description = "Required English language level (CEFR — official German sources state English requirements this way), empty string if not stated or not required.",
                        },
                        requiresCertifiedLanguageProof = new { type = "boolean", description = "Whether a certified language exam certificate is explicitly required for admission." },
                        minEducationLevel = new
                        {
                            type = "string",
                            @enum = new[] { "HighSchool", "TechnicalDiploma", "Bachelors", "Masters", "Doctorate", "" },
                            description = "Minimum prior education required for admission (e.g. a Bachelor's degree for a Master's program), empty string if not determinable.",
                        },
                        tuitionFeeEurText = new
                        {
                            type = "string",
                            description = "Tuition fee in EUR per year or semester as a plain integer string (e.g. '1500'), '0' if explicitly tuition-free, empty string if genuinely not stated.",
                        },
                        applicationDeadlineIso = new
                        {
                            type = "string",
                            description = "Application deadline in ISO 8601 (YYYY-MM-DD) if explicitly stated for the current/next intake, else empty string.",
                        },
                    },
                    required = new[]
                    {
                        "title", "provider", "location", "description", "sourceUrl",
                        "requiredGermanLevel", "requiredEnglishLevel", "requiresCertifiedLanguageProof",
                        "minEducationLevel", "tuitionFeeEurText", "applicationDeadlineIso",
                    },
                    additionalProperties = false,
                },
            },
        }),
        ["required"] = JsonSerializer.SerializeToElement(new[] { "programsFound" }),
        ["additionalProperties"] = JsonSerializer.SerializeToElement(false),
    };

    private record ResearchResult([property: JsonPropertyName("programsFound")] List<ProgramExtraction> ProgramsFound);

    private record ProgramExtraction(
        [property: JsonPropertyName("title")] string Title,
        [property: JsonPropertyName("provider")] string Provider,
        [property: JsonPropertyName("location")] string Location,
        [property: JsonPropertyName("description")] string Description,
        [property: JsonPropertyName("sourceUrl")] string SourceUrl,
        [property: JsonPropertyName("requiredGermanLevel")] string RequiredGermanLevel,
        [property: JsonPropertyName("requiredEnglishLevel")] string RequiredEnglishLevel,
        [property: JsonPropertyName("requiresCertifiedLanguageProof")] bool RequiresCertifiedLanguageProof,
        [property: JsonPropertyName("minEducationLevel")] string MinEducationLevel,
        [property: JsonPropertyName("tuitionFeeEurText")] string TuitionFeeEurText,
        [property: JsonPropertyName("applicationDeadlineIso")] string ApplicationDeadlineIso);
}

public record UniversityProgramCandidate(
    string Title,
    string Provider,
    string? Location,
    string? Description,
    string SourceUrl,
    string? RequiredGermanLevel,
    string? RequiredEnglishLevel,
    bool RequiresCertifiedLanguageProof,
    string? MinEducationLevel,
    string? TuitionFeeEurText,
    string? ApplicationDeadlineIso);

// Candidates plus real token usage — added 2026-08-30 so cost is visible
// (logged per call, and surfaced up through GenerateUniversityAsync's
// result to the admin UI) instead of only ever being guessed at.
public record ResearchOutcome(
    List<UniversityProgramCandidate> Candidates, long InputTokens, long OutputTokens, decimal EstimatedCostUsd)
{
    public static ResearchOutcome Empty { get; } = new([], 0, 0, 0);
}
