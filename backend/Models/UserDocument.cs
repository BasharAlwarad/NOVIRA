namespace Novira.Backend.Models;

// Starting scope for the document-verification pipeline (Level 2/3 of the
// four-level user-data model — see Models/User.cs and Plan.md). Passport +
// education certificate first, since those are what the founder can
// realistically test with his own fake documents; LanguageCertificate/Other
// exist for when the pipeline is validated and the set widens.
public enum DocumentType
{
    Passport,
    EducationCertificate,
    LanguageCertificate,
    Other,
}

// Whether the automated AI verification step itself succeeded — separate
// from the human's judgment about the document's content (ReviewStatus
// below). A Failed row (e.g. the Claude API call errored) still needs a
// human to look at it; it just won't have AI-extracted data to help.
public enum AiVerificationStatus
{
    Pending,
    Completed,
    Failed,
}

// The human reviewer's decision — always made per-document, not batched
// across a user's whole account (a passport can be Approved while a
// certificate is Denied). FlaggedRed is deliberately distinct from Denied:
// Denied means "legitimate document, doesn't meet requirements, invites a
// reupload"; FlaggedRed means "suspected fraud/forgery" and additionally
// sets User.FraudFlagged (see that model's comment).
public enum DocumentReviewStatus
{
    PendingReview,
    Approved,
    Denied,
    FlaggedRed,
}

public class UserDocument
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required Guid UserId { get; set; }

    // The user's own label for the document (e.g. "My passport"),
    // distinct from OriginalFileName below. Required going forward at the
    // API layer (POST /documents validates it's non-empty) but nullable in
    // the DB so it doesn't need a fake backfill value for rows that predate
    // this field.
    public string? Name { get; set; }

    // No longer user-selected at upload time — the AI determines this from
    // what the document actually is (DocumentVerificationService's
    // documentTypeCategory), not what the uploader labeled it as. Null
    // until AI verification completes (or if it fails); a human reviewer
    // can still set it via ReviewNote/manual correction if ever needed.
    public DocumentType? DocumentType { get; set; }

    // Storage — StorageBlobName is the private Azure Blob path
    // ({userId}/{documentId}{extension}), never a public URL. The frontend
    // never talks to Azure directly (no Firebase/Azure client SDK, no
    // exposed credentials) — the admin UI gets a short-lived read SAS URI
    // from the backend on demand (see AzureBlobStorageService).
    public required string StorageBlobName { get; set; }
    public required string OriginalFileName { get; set; }
    public required string ContentType { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    // AI verification — runs automatically right after upload (see
    // DocumentsEndpoints), not on a manual admin trigger, so a document is
    // already AI-reviewed by the time a human ever opens it.
    public AiVerificationStatus AiVerificationStatus { get; set; } = AiVerificationStatus.Pending;
    public string? AiExtractedName { get; set; }
    // Whether the AI judged AiExtractedName to plausibly match the user's
    // self-reported User.FullName (allowing for spelling/order/
    // transliteration variance) — a mismatch is also surfaced in AiFlagsJson
    // as a concrete flag for the human reviewer, never used to silently
    // overwrite User.FullName.
    public bool? AiNameMatchesProfile { get; set; }
    // JSON object: { documentTypeDetected, issuerOrInstitution, expiryDate, legible }
    public string? AiExtractedDataJson { get; set; }
    // JSON array of concrete, specific concern strings (e.g. "name on
    // document does not match profile", "image is blurry", "document
    // appears expired") — empty array if none.
    public string? AiFlagsJson { get; set; }
    // One or two plain-language sentences for the admin list/detail view.
    public string? AiSummary { get; set; }
    public DateTime? AiVerifiedAt { get; set; }

    // Human review
    public DocumentReviewStatus ReviewStatus { get; set; } = DocumentReviewStatus.PendingReview;
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewNote { get; set; }
    // As of 2026-08-27, this no longer tracks whether the decision itself
    // reached the user — that content is now a real Message row (Models/
    // Message.cs), always persisted regardless of email. This instead
    // tracks whether the content-free "you have an update" notification
    // ping succeeded (DocumentsAdminEndpoints.cs), so a flaky Resend can
    // never silently mask the fact that a message is genuinely waiting for
    // them in-app — same "provider failure must be visible" discipline as
    // Users.emailSent on /leads, just applied to a smaller stake now.
    public bool RejectionMessageSent { get; set; }
}
