using System.Text.Json.Serialization;

namespace Novira.Backend.Models;

// Structured CV/cover-letter content — what Claude actually generates (see
// CvGenerationService), kept deliberately separate from PDF layout (see
// CvPdfRenderer). Claude's job is drafting tailored content; a deterministic
// template renders it, so a revision never risks an inconsistent layout.
// Stored as JSON on CvRequest.CvContentJson/CoverLetterContentJson.
//
// [JsonPropertyName] on every field, matching the lowercase-camelCase
// schema keys CvGenerationService.BuildSchema() declares — System.Text.Json
// matches property names case-SENSITIVELY by default (no global
// case-insensitive option is set anywhere in this app), so without these
// attributes a deserialize silently returns an all-default/empty object
// instead of throwing. Found live (2026-10-01): a real generation call
// consumed real output tokens (Claude genuinely drafted full content) but
// every field came back null/empty — same discipline DocumentVerification-
// Service.ExtractionResult already uses, just missed when these were first
// written.
public class CvDraftContent
{
    [JsonPropertyName("fullName")] public string FullName { get; set; } = string.Empty;
    [JsonPropertyName("phone")] public string? Phone { get; set; }
    [JsonPropertyName("address")] public string? Address { get; set; }
    [JsonPropertyName("dateOfBirth")] public string? DateOfBirth { get; set; }
    [JsonPropertyName("summary")] public string? Summary { get; set; }
    [JsonPropertyName("experience")] public List<CvDraftExperienceEntry> Experience { get; set; } = [];
    [JsonPropertyName("education")] public List<CvDraftEducationEntry> Education { get; set; } = [];
    [JsonPropertyName("skills")] public string? Skills { get; set; }
    [JsonPropertyName("languages")] public string? Languages { get; set; }
    [JsonPropertyName("certifications")] public string? Certifications { get; set; }
}

public class CvDraftExperienceEntry
{
    [JsonPropertyName("title")] public string Title { get; set; } = string.Empty;
    [JsonPropertyName("employer")] public string Employer { get; set; } = string.Empty;
    [JsonPropertyName("dateRange")] public string? DateRange { get; set; }
    [JsonPropertyName("bullets")] public List<string> Bullets { get; set; } = [];
}

public class CvDraftEducationEntry
{
    [JsonPropertyName("qualification")] public string Qualification { get; set; } = string.Empty;
    [JsonPropertyName("institution")] public string Institution { get; set; } = string.Empty;
    [JsonPropertyName("dateRange")] public string? DateRange { get; set; }
}

public class CoverLetterDraftContent
{
    [JsonPropertyName("recipientLine")] public string RecipientLine { get; set; } = string.Empty;
    [JsonPropertyName("paragraphs")] public List<string> Paragraphs { get; set; } = [];
    [JsonPropertyName("closingLine")] public string ClosingLine { get; set; } = string.Empty;
}

public class CvGenerationResult
{
    [JsonPropertyName("cv")] public CvDraftContent Cv { get; set; } = new();
    [JsonPropertyName("coverLetter")] public CoverLetterDraftContent CoverLetter { get; set; } = new();
}

// One turn of the admin<->Claude revision conversation, stored as a JSON
// array on CvRequest.ConversationJson so "ask for changes" is a real
// multi-turn edit (Claude sees exactly what it said before and what was
// asked to change), not a from-scratch regeneration each time. Deliberately
// just role+text — no image/document blocks are ever part of this
// conversation.
public record CvConversationTurn(string Role, string Text);
