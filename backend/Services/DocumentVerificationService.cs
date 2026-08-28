using System.Text.Json;
using System.Text.Json.Serialization;
using Anthropic;
using Anthropic.Models.Messages;

namespace Novira.Backend.Services;

// The AI-verification step of the document pipeline (Level 2 of the
// four-level user-data model — see Models/User.cs). This is the first real
// LLM call anywhere in the live app: everything before this (the Tier 1
// verdict, eligibility checks, opportunity matching) is a deterministic
// rules engine by deliberate design — see Matching-Algorithm-Study.md §5.1
// and CLAUDE.md's "Matching algorithm" section for why. Document
// verification is a genuinely different case: the input is an unstructured
// scanned image/PDF, which no rule can read. It still stays inside the
// existing human-in-the-loop discipline — this service only extracts and
// flags, a human makes the actual approve/deny/flag decision
// (DocumentsAdminEndpoints), never this.
//
// Uses Claude's vision + structured outputs (output_config.format) rather
// than a free-text opinion, so the result is always a fixed, typed shape a
// human reviewer's UI can render consistently — never an AI-authored
// paragraph the admin has to parse.
public class DocumentVerificationService
{
    private readonly AnthropicClient _client;
    private readonly ILogger<DocumentVerificationService> _logger;

    public DocumentVerificationService(IConfiguration configuration, ILogger<DocumentVerificationService> logger)
    {
        var apiKey = configuration["Anthropic:ApiKey"];
        _client = string.IsNullOrWhiteSpace(apiKey) ? new AnthropicClient() : new AnthropicClient { ApiKey = apiKey };
        _logger = logger;
    }

    // No longer takes a user-asserted DocumentType — the whole point is that
    // the AI determines what the document actually is rather than trusting
    // a label the uploader picked (see UserDocument.DocumentType's comment).
    public async Task<DocumentVerificationResult> VerifyAsync(
        string? profileFullName,
        byte[] fileBytes,
        string contentType)
    {
        var base64Data = Convert.ToBase64String(fileBytes);

        var promptText =
            $"""
            You are reviewing a document uploaded by a user of NOVIRA, a platform helping people from the Middle East/North Africa region find study, Ausbildung, or employment pathways to Germany. The user gave this document their own label when uploading, but that label is not trustworthy — determine independently what the document actually is from its contents.

            The user's self-reported full name on their profile is: "{(string.IsNullOrWhiteSpace(profileFullName) ? "(not provided)" : profileFullName)}"

            Carefully examine the attached document and extract the requested fields. Be conservative and factual — only report what is actually visible and legible in the document itself; do not guess or infer beyond what's shown. This is a human-in-the-loop review: a person will read your output and make the final approve/deny decision, so surface concrete, specific concerns rather than making the final call yourself.

            Beyond the review fields, extract whatever identity/education/language details this specific document actually contains — if a human reviewer approves this document, these values are written onto the user's verified profile and used to find better-matched opportunities, so precision matters. Only fill in fields that are actually relevant to and visible on this particular document; leave everything else as an empty string. For dateOfBirth/expiryDate use ISO 8601 (YYYY-MM-DD). For certifiedLevel: if certifiedLanguage is "German", certifiedLevel must be one of A1/A2/B1/B2/C1/C1Plus (the CEFR scale); if certifiedLanguage is "English", certifiedLevel must be one of Beginner/Intermediate/Advanced/Fluent (the casual scale) — use whichever scale the certificate itself actually reports against.
            """;

        List<ContentBlockParam> content = contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase)
            ?
            [
                new ImageBlockParam { Source = new Base64ImageSource { MediaType = contentType, Data = base64Data } },
                new TextBlockParam { Text = promptText },
            ]
            :
            [
                new DocumentBlockParam { Source = new Base64PdfSource { Data = base64Data } },
                new TextBlockParam { Text = promptText },
            ];

        var parameters = new MessageCreateParams
        {
            Model = "claude-opus-5",
            MaxTokens = 8000,
            OutputConfig = new OutputConfig
            {
                Format = new JsonOutputFormat { Schema = BuildSchema() },
            },
            Messages = [new() { Role = Role.User, Content = content }],
        };

        var response = await _client.Messages.Create(parameters);

        if (response.StopReason == "refusal")
        {
            _logger.LogWarning("Document verification declined by safety classifiers.");
            throw new InvalidOperationException("Document verification was declined by the model's safety classifiers.");
        }

        var textBlock = response.Content.Select(b => b.Value).OfType<TextBlock>().FirstOrDefault();
        if (textBlock is null)
        {
            throw new InvalidOperationException("Verification response contained no text content.");
        }

        var extraction = JsonSerializer.Deserialize<ExtractionResult>(textBlock.Text)
            ?? throw new InvalidOperationException("Failed to parse verification response JSON.");

        return new DocumentVerificationResult(
            extraction.DocumentTypeCategory,
            extraction.DocumentTypeDetected,
            extraction.ExtractedFullName,
            extraction.IssuerOrInstitution,
            extraction.ExpiryDate,
            extraction.Legible,
            extraction.NameMatchesProfile,
            extraction.Concerns,
            extraction.Summary,
            extraction.DateOfBirth,
            extraction.Nationality,
            extraction.DocumentNumber,
            extraction.HighestEducationLevel,
            extraction.FieldOfStudy,
            extraction.CertifiedLanguage,
            extraction.CertifiedLevel);
    }

    private static Dictionary<string, JsonElement> BuildSchema() => new()
    {
        ["type"] = JsonSerializer.SerializeToElement("object"),
        ["properties"] = JsonSerializer.SerializeToElement(new
        {
            // Constrained to exactly NOVIRA's own DocumentType enum member
            // names (Models/UserDocument.cs) so the backend can parse this
            // straight into that enum — "Other" is the deliberate catch-all
            // for anything that isn't one of the three specific categories.
            documentTypeCategory = new
            {
                type = "string",
                @enum = new[] { "Passport", "EducationCertificate", "LanguageCertificate", "Other" },
                description = "Which category this document actually belongs to, based solely on its contents — ignore whatever label the user gave it. Use 'Other' if it's none of the specific three (e.g. a travel-movement certificate, an ID card, an unrelated document).",
            },
            documentTypeDetected = new
            {
                type = "string",
                description = "A specific, free-text description of what kind of document this actually is, e.g. 'Egyptian passport biodata page', 'Egyptian Ministry of Interior travel-movement certificate', 'university Bachelor's degree certificate'.",
            },
            extractedFullName = new
            {
                type = "string",
                description = "The full name exactly as printed on the document. Empty string if not legible or not present.",
            },
            issuerOrInstitution = new
            {
                type = "string",
                description = "The issuing authority, government body, or institution named on the document. Empty string if not present.",
            },
            expiryDate = new
            {
                type = "string",
                description = "Expiry or valid-until date in ISO 8601 (YYYY-MM-DD) if present and legible, else an empty string.",
            },
            legible = new
            {
                type = "boolean",
                description = "Whether the document is clearly legible and appears complete, uncropped, and undamaged.",
            },
            nameMatchesProfile = new
            {
                type = "boolean",
                description = "Whether extractedFullName plausibly matches the profile name given in the prompt, allowing for reasonable variation in spelling, name order, or transliteration. If the profile name was not provided, use true (nothing to contradict).",
            },
            concerns = new
            {
                type = "array",
                items = new { type = "string" },
                description = "Concrete, specific concerns a human reviewer should know about (e.g. 'name on document does not match profile', 'document appears expired', 'image is blurry', 'possible signs of tampering', 'uploaded label does not match the actual document type'). Empty array if none.",
            },
            summary = new
            {
                type = "string",
                description = "One or two plain-language sentences summarizing what this document is and its verification status, written for a human reviewer.",
            },
            // The remaining fields feed the user's verified profile on
            // approval (see Models/User.cs's Verified* fields and
            // DocumentsAdminEndpoints.cs's ApplyVerifiedDataFromDocument) —
            // empty string when not applicable to this document, same
            // sentinel convention as expiryDate/issuerOrInstitution above.
            dateOfBirth = new
            {
                type = "string",
                description = "Date of birth in ISO 8601 (YYYY-MM-DD) if present and legible (typically a passport), else an empty string.",
            },
            nationality = new
            {
                type = "string",
                description = "Nationality/citizenship as printed on the document (typically a passport), else an empty string.",
            },
            documentNumber = new
            {
                type = "string",
                description = "The document's own identifying number (e.g. passport number, certificate number), else an empty string.",
            },
            highestEducationLevel = new
            {
                type = "string",
                @enum = new[] { "HighSchool", "TechnicalDiploma", "Bachelors", "Masters", "Doctorate", "" },
                description = "Only for an education certificate/diploma: the level this specific credential represents. Empty string for any other document type or if not determinable.",
            },
            fieldOfStudy = new
            {
                type = "string",
                description = "Only for an education certificate: the field/subject of study or degree title, else an empty string.",
            },
            certifiedLanguage = new
            {
                type = "string",
                @enum = new[] { "German", "English", "" },
                description = "Only for a language certificate: which language it certifies. Empty string for any other document type.",
            },
            certifiedLevel = new
            {
                type = "string",
                @enum = new[] { "A1", "A2", "B1", "B2", "C1", "C1Plus", "Beginner", "Intermediate", "Advanced", "Fluent", "" },
                description = "Only for a language certificate: the certified level, using the CEFR scale (A1/A2/B1/B2/C1/C1Plus) if certifiedLanguage is German, or the casual scale (Beginner/Intermediate/Advanced/Fluent) if certifiedLanguage is English — whichever scale the certificate itself reports against. Empty string for any other document type.",
            },
        }),
        ["required"] = JsonSerializer.SerializeToElement(new[]
        {
            "documentTypeCategory", "documentTypeDetected", "extractedFullName", "issuerOrInstitution",
            "expiryDate", "legible", "nameMatchesProfile", "concerns", "summary",
            "dateOfBirth", "nationality", "documentNumber", "highestEducationLevel", "fieldOfStudy",
            "certifiedLanguage", "certifiedLevel",
        }),
        ["additionalProperties"] = JsonSerializer.SerializeToElement(false),
    };

    private record ExtractionResult(
        [property: JsonPropertyName("documentTypeCategory")] string DocumentTypeCategory,
        [property: JsonPropertyName("documentTypeDetected")] string DocumentTypeDetected,
        [property: JsonPropertyName("extractedFullName")] string ExtractedFullName,
        [property: JsonPropertyName("issuerOrInstitution")] string IssuerOrInstitution,
        [property: JsonPropertyName("expiryDate")] string ExpiryDate,
        [property: JsonPropertyName("legible")] bool Legible,
        [property: JsonPropertyName("nameMatchesProfile")] bool NameMatchesProfile,
        [property: JsonPropertyName("concerns")] List<string> Concerns,
        [property: JsonPropertyName("summary")] string Summary,
        [property: JsonPropertyName("dateOfBirth")] string DateOfBirth,
        [property: JsonPropertyName("nationality")] string Nationality,
        [property: JsonPropertyName("documentNumber")] string DocumentNumber,
        [property: JsonPropertyName("highestEducationLevel")] string HighestEducationLevel,
        [property: JsonPropertyName("fieldOfStudy")] string FieldOfStudy,
        [property: JsonPropertyName("certifiedLanguage")] string CertifiedLanguage,
        [property: JsonPropertyName("certifiedLevel")] string CertifiedLevel);
}

public record DocumentVerificationResult(
    string DocumentTypeCategory,
    string DocumentTypeDetected,
    string ExtractedFullName,
    string IssuerOrInstitution,
    string ExpiryDate,
    bool Legible,
    bool NameMatchesProfile,
    List<string> Concerns,
    string Summary,
    string DateOfBirth,
    string Nationality,
    string DocumentNumber,
    string HighestEducationLevel,
    string FieldOfStudy,
    string CertifiedLanguage,
    string CertifiedLevel);
