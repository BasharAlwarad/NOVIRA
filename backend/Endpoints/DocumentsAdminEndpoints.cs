using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Models;
using Novira.Backend.Services;

namespace Novira.Backend.Endpoints;

public record AdminUserListItem(
    Guid Id,
    string Email,
    string? FullName,
    // Level 3 — set once an admin approves a document containing a name
    // (see User.VerifiedFullName). FullName above is the Level-1
    // self-reported field, which nothing in the app actually collects yet
    // (no name question in the assessment) — it's realistically always
    // null, so the frontend prefers this field when displaying a name.
    string? VerifiedFullName,
    bool FraudFlagged,
    int PendingDocumentCount,
    DateTime CreatedAt);

public record AdminDocumentResponse(
    Guid Id,
    string Name,
    DocumentType? DocumentType,
    string OriginalFileName,
    string ContentType,
    DateTime UploadedAt,
    string? PreviewUrl, // short-lived SAS URL, regenerated on every fetch — never persisted
    AiVerificationStatus AiVerificationStatus,
    string? AiExtractedName,
    bool? AiNameMatchesProfile,
    string? AiDocumentTypeDetected,
    string? AiIssuerOrInstitution,
    string? AiExpiryDate,
    bool? AiLegible,
    string? AiDateOfBirth,
    string? AiNationality,
    string? AiDocumentNumber,
    string? AiHighestEducationLevel,
    string? AiFieldOfStudy,
    string? AiCertifiedLanguage,
    string? AiCertifiedLevel,
    List<string> AiFlags,
    string? AiSummary,
    DateTime? AiVerifiedAt,
    DocumentReviewStatus ReviewStatus,
    DateTime? ReviewedAt,
    string? ReviewNote,
    bool RejectionMessageSent);

public record AdminUserDetailResponse(
    Guid Id,
    string Email,
    string? FullName,
    DateTime CreatedAt,
    bool FraudFlagged,
    DateTime? FraudFlaggedAt,
    string? FraudFlagNote,
    // Tier 1 profile snapshot — same fields as User.cs, self-reported only.
    string? Country,
    string? Age,
    EducationLevel? HighestEducation,
    string? OccupationField,
    WorkExperience? WorkExperience,
    DesiredPath? DesiredPath,
    LanguageLevel? GermanLevel,
    LanguageLevel? EnglishLevel,
    LanguageCertificateStatus? LanguageCertificate,
    PassportStatus? PassportStatus,
    List<GermanyConnection>? GermanyConnection,
    FinancialSituation? FinancialSituation,
    StartTimeline? StartTimeline,
    RegionFlexibility? RegionFlexibility,
    DateTime? ProfileUpdatedAt,
    // Level 3 — populated only when an admin Approves a document (see
    // ApplyVerifiedDataFromDocument below). Same field set as User.cs.
    string? VerifiedFullName,
    string? VerifiedDateOfBirth,
    string? VerifiedNationality,
    string? VerifiedPassportNumber,
    string? VerifiedPassportExpiryDate,
    PassportStatus? VerifiedPassportStatus,
    EducationLevel? VerifiedHighestEducation,
    string? VerifiedFieldOfStudy,
    LanguageLevel? VerifiedGermanLevel,
    LanguageLevel? VerifiedEnglishLevel,
    DateTime? VerifiedDataUpdatedAt,
    List<AdminDocumentResponse> Documents,
    // Every message ever sent to this user, newest first — free-text sends
    // and the automatic Deny/FlagRed notices (see the PATCH handler below)
    // both land in the same Messages table, so this is a full audit trail,
    // not just what the admin typed manually. Reuses MessagesEndpoints.cs's
    // MessageResponse rather than duplicating an identical record.
    List<MessageResponse> Messages);

public record ReviewDocumentRequest(DocumentReviewStatus Status, string? Note);
public record SendMessageRequest(string Subject, string Body);

// Admin-key-protected (AdminAuthFilter) counterpart to DocumentsEndpoints —
// the founder's review surface for the /admin/users/profiles UI. Every
// review action (Approve/Deny/FlagRed) is per-document, never a batch
// action across a user's whole account.
public static class DocumentsAdminEndpoints
{
    public static void MapDocumentsAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/admin/users").AddEndpointFilter<AdminAuthFilter>();

        group.MapGet("/", async (string? search, AppDbContext db) =>
        {
            var query = db.Users.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var pattern = $"%{search.Trim()}%";
                query = query.Where(u =>
                    EF.Functions.ILike(u.Email, pattern) ||
                    (u.FullName != null && EF.Functions.ILike(u.FullName, pattern)) ||
                    (u.VerifiedFullName != null && EF.Functions.ILike(u.VerifiedFullName, pattern)));
            }

            var users = await query.ToListAsync();
            var userIds = users.Select(u => u.Id).ToList();

            // "Needs human review" — every document whose AI step has
            // already run (synchronous on upload, see DocumentsEndpoints)
            // and is still awaiting a human decision.
            var pendingCounts = await db.UserDocuments
                .Where(d => userIds.Contains(d.UserId) && d.ReviewStatus == DocumentReviewStatus.PendingReview)
                .GroupBy(d => d.UserId)
                .Select(g => new { UserId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.UserId, x => x.Count);

            var items = users
                .Select(u => new AdminUserListItem(
                    u.Id, u.Email, u.FullName, u.VerifiedFullName, u.FraudFlagged,
                    pendingCounts.GetValueOrDefault(u.Id, 0), u.CreatedAt))
                .OrderByDescending(u => u.PendingDocumentCount > 0)
                .ThenByDescending(u => u.PendingDocumentCount)
                .ThenByDescending(u => u.CreatedAt)
                .ToList();

            return Results.Ok(items);
        });

        group.MapGet("/{id:guid}", async (Guid id, AppDbContext db, AzureBlobStorageService storage) =>
        {
            var user = await db.Users.FindAsync(id);
            if (user is null)
            {
                return Results.NotFound();
            }

            var documents = await db.UserDocuments
                .Where(d => d.UserId == id)
                .OrderByDescending(d => d.UploadedAt)
                .ToListAsync();
            var messages = await LoadMessagesAsync(db, id);

            return Results.Ok(ToAdminUserDetailResponse(user, documents, messages, storage));
        });

        group.MapPatch("/{userId:guid}/documents/{documentId:guid}", async (
            Guid userId,
            Guid documentId,
            ReviewDocumentRequest request,
            AppDbContext db,
            ResendEmailService emailService,
            AzureBlobStorageService storage) =>
        {
            if (request.Status is not (DocumentReviewStatus.Approved or DocumentReviewStatus.Denied or DocumentReviewStatus.FlaggedRed))
            {
                return Results.BadRequest(new { message = "Status must be Approved, Denied, or FlaggedRed." });
            }

            var document = await db.UserDocuments.FirstOrDefaultAsync(d => d.Id == documentId && d.UserId == userId);
            if (document is null)
            {
                return Results.NotFound();
            }

            var user = await db.Users.FindAsync(userId);
            if (user is null)
            {
                return Results.NotFound();
            }

            document.ReviewStatus = request.Status;
            document.ReviewedAt = DateTime.UtcNow;
            document.ReviewNote = request.Note;

            // FlagRed is a per-document button but a user-level consequence —
            // one fraudulent document is a signal about the person, not just
            // that document (see the comment on User.FraudFlagged). Blocks
            // further self-service uploads until manually cleared.
            if (request.Status == DocumentReviewStatus.FlaggedRed)
            {
                user.FraudFlagged = true;
                user.FraudFlaggedAt = DateTime.UtcNow;
                user.FraudFlagNote = request.Note;
            }

            // The Approve-gated trust boundary — see the comment on
            // User.VerifiedFullName. This is the only place extracted
            // document data is ever written onto the account.
            if (request.Status == DocumentReviewStatus.Approved)
            {
                ApplyVerifiedDataFromDocument(user, document);
            }

            await db.SaveChangesAsync();

            // Content moves in-app (2026-08-27) — a real Message row, not
            // an emailed HTML body. RejectionMessageSent now tracks whether
            // the content-free notification ping succeeded, not whether the
            // decision itself reached the user: the Message row is always
            // persisted regardless of Resend's availability.
            if (request.Status is DocumentReviewStatus.Denied or DocumentReviewStatus.FlaggedRed)
            {
                var (subject, body) = BuildDecisionMessageText(document.Name ?? document.OriginalFileName, request.Status, request.Note);
                db.Messages.Add(new Message { UserId = user.Id, Subject = subject, Body = body });
                await db.SaveChangesAsync();

                document.RejectionMessageSent = await emailService.SendMessageNotificationAsync(user.Email);
                await db.SaveChangesAsync();
            }

            return Results.Ok(ToAdminDocumentResponse(document, storage));
        });

        // Documents approved before ApplyVerifiedDataFromDocument existed
        // (2026-08-16) were never backfilled — see the comment on
        // User.VerifiedFullName. This is the catch-up path: re-runs the same
        // promotion logic over every already-Approved document for this
        // user, oldest upload first (so, for fields multiple documents
        // could set, the most-recently-uploaded document's value wins —
        // the same "last write wins" behavior live approvals already have).
        // Safe to call repeatedly; it only ever re-derives from documents
        // that were already Approved by a human.
        group.MapPost("/{id:guid}/recompute-verified-data", async (
            Guid id,
            AppDbContext db,
            AzureBlobStorageService storage) =>
        {
            var user = await db.Users.FindAsync(id);
            if (user is null)
            {
                return Results.NotFound();
            }

            var approvedDocuments = await db.UserDocuments
                .Where(d => d.UserId == id && d.ReviewStatus == DocumentReviewStatus.Approved)
                .OrderBy(d => d.UploadedAt)
                .ToListAsync();

            foreach (var document in approvedDocuments)
            {
                ApplyVerifiedDataFromDocument(user, document);
            }

            await db.SaveChangesAsync();

            var documents = await db.UserDocuments
                .Where(d => d.UserId == id)
                .OrderByDescending(d => d.UploadedAt)
                .ToListAsync();
            var messages = await LoadMessagesAsync(db, id);

            return Results.Ok(ToAdminUserDetailResponse(user, documents, messages, storage));
        });

        // Admin-initiated full account deletion — the same real, complete
        // removal as the user's own DELETE /account (AccountEndpoints.cs),
        // not a soft-delete flag. Reuses the same already-tested FK cascade
        // (Sessions, MagicLinkTokens, UserDocuments -> Users) and the same
        // best-effort blob cleanup that never blocks the DB deletion.
        group.MapDelete("/{id:guid}", async (
            Guid id,
            AppDbContext db,
            AzureBlobStorageService storage,
            ILoggerFactory loggerFactory) =>
        {
            var user = await db.Users.FindAsync(id);
            if (user is null)
            {
                return Results.NotFound();
            }

            var logger = loggerFactory.CreateLogger("AdminUsers");

            try
            {
                await storage.DeleteAllForUserAsync(user.Id);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to delete blob storage files for user {UserId} during admin-initiated account deletion.", user.Id);
            }

            db.Users.Remove(user);
            await db.SaveChangesAsync();

            return Results.NoContent();
        });

        // The general-purpose, free-text escape hatch — not tied to any one
        // document, for anything the fixed Approve/Deny/FlagRed actions
        // don't cover.
        group.MapPost("/{userId:guid}/message", async (
            Guid userId,
            SendMessageRequest request,
            AppDbContext db,
            ResendEmailService emailService) =>
        {
            if (string.IsNullOrWhiteSpace(request.Subject) || string.IsNullOrWhiteSpace(request.Body))
            {
                return Results.BadRequest(new { message = "Subject and body are required." });
            }

            var user = await db.Users.FindAsync(userId);
            if (user is null)
            {
                return Results.NotFound();
            }

            // Same in-app-first shift as the decision-email branch above —
            // the message is always persisted; `sent` reflects only whether
            // the notification ping succeeded.
            db.Messages.Add(new Message { UserId = user.Id, Subject = request.Subject, Body = request.Body });
            await db.SaveChangesAsync();

            var sent = await emailService.SendMessageNotificationAsync(user.Email);
            return Results.Ok(new { sent });
        });
    }

    private static AdminUserDetailResponse ToAdminUserDetailResponse(
        User user, List<UserDocument> documents, List<Message> messages, AzureBlobStorageService storage) =>
        new(
            user.Id, user.Email, user.FullName, user.CreatedAt,
            user.FraudFlagged, user.FraudFlaggedAt, user.FraudFlagNote,
            user.Country, user.Age, user.HighestEducation, user.OccupationField,
            user.WorkExperience, user.DesiredPath, user.GermanLevel, user.EnglishLevel,
            user.LanguageCertificate, user.PassportStatus, user.GermanyConnection,
            user.FinancialSituation, user.StartTimeline, user.RegionFlexibility,
            user.ProfileUpdatedAt,
            user.VerifiedFullName, user.VerifiedDateOfBirth, user.VerifiedNationality,
            user.VerifiedPassportNumber, user.VerifiedPassportExpiryDate, user.VerifiedPassportStatus,
            user.VerifiedHighestEducation, user.VerifiedFieldOfStudy,
            user.VerifiedGermanLevel, user.VerifiedEnglishLevel, user.VerifiedDataUpdatedAt,
            documents.Select(d => ToAdminDocumentResponse(d, storage)).ToList(),
            messages.Select(m => new MessageResponse(m.Id, m.Subject, m.Body, m.CreatedAt, m.ReadAt)).ToList());

    private static Task<List<Message>> LoadMessagesAsync(AppDbContext db, Guid userId) =>
        db.Messages.Where(m => m.UserId == userId).OrderByDescending(m => m.CreatedAt).ToListAsync();

    private static AdminDocumentResponse ToAdminDocumentResponse(UserDocument d, AzureBlobStorageService storage)
    {
        string? previewUrl = null;
        try
        {
            previewUrl = storage.GenerateReadSasUri(d.StorageBlobName).ToString();
        }
        catch (Exception)
        {
            // Leave null — the admin UI shows "preview unavailable" rather
            // than failing the whole detail request over one bad blob.
        }

        var flags = string.IsNullOrWhiteSpace(d.AiFlagsJson)
            ? []
            : JsonSerializer.Deserialize<List<string>>(d.AiFlagsJson) ?? [];

        var extracted = string.IsNullOrWhiteSpace(d.AiExtractedDataJson)
            ? null
            : JsonSerializer.Deserialize<AiExtractedData>(d.AiExtractedDataJson);

        return new AdminDocumentResponse(
            d.Id, d.Name ?? d.OriginalFileName, d.DocumentType, d.OriginalFileName, d.ContentType, d.UploadedAt, previewUrl,
            d.AiVerificationStatus, d.AiExtractedName, d.AiNameMatchesProfile,
            extracted?.DocumentTypeDetected, extracted?.IssuerOrInstitution, extracted?.ExpiryDate, extracted?.Legible,
            NullIfEmpty(extracted?.DateOfBirth), NullIfEmpty(extracted?.Nationality), NullIfEmpty(extracted?.DocumentNumber),
            NullIfEmpty(extracted?.HighestEducationLevel), NullIfEmpty(extracted?.FieldOfStudy),
            NullIfEmpty(extracted?.CertifiedLanguage), NullIfEmpty(extracted?.CertifiedLevel),
            flags, d.AiSummary, d.AiVerifiedAt,
            d.ReviewStatus, d.ReviewedAt, d.ReviewNote, d.RejectionMessageSent);
    }

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value;

    // The trust-boundary hook — the only place UserDocument's AI-extracted
    // data is ever promoted onto the account, called only from the Approved
    // branch above. Never blanks an existing Verified* field with an empty
    // extraction; only writes what this document actually and legibly
    // contained. See the comment on User.VerifiedFullName for why this is
    // gated on an explicit human Approve rather than AI completion alone.
    private static void ApplyVerifiedDataFromDocument(User user, UserDocument document)
    {
        var extracted = string.IsNullOrWhiteSpace(document.AiExtractedDataJson)
            ? null
            : JsonSerializer.Deserialize<AiExtractedData>(document.AiExtractedDataJson);

        var wroteAnything = false;

        // Only the three structurally-understood document types can assert
        // identity — "Other" is the AI's catch-all for "not confidently one
        // of the specific three" (see DocumentVerificationService.cs), so a
        // name extracted from it isn't trustworthy enough to promote. Found
        // live during the first real recompute test: an "Other" work-
        // experience letter's incidentally-extracted name overwrote a real
        // passport's name for the same account, purely because it happened
        // to be uploaded later — this gate closes that.
        var canAssertIdentity = document.DocumentType is DocumentType.Passport
            or DocumentType.EducationCertificate or DocumentType.LanguageCertificate;

        if (canAssertIdentity && !string.IsNullOrWhiteSpace(document.AiExtractedName))
        {
            user.VerifiedFullName = document.AiExtractedName;
            wroteAnything = true;
        }

        if (extracted is not null)
        {
            if (document.DocumentType == DocumentType.Passport)
            {
                if (!string.IsNullOrWhiteSpace(extracted.DateOfBirth))
                {
                    user.VerifiedDateOfBirth = extracted.DateOfBirth;
                    wroteAnything = true;
                }

                if (!string.IsNullOrWhiteSpace(extracted.Nationality))
                {
                    user.VerifiedNationality = extracted.Nationality;
                    wroteAnything = true;
                }

                if (!string.IsNullOrWhiteSpace(extracted.DocumentNumber))
                {
                    user.VerifiedPassportNumber = extracted.DocumentNumber;
                    wroteAnything = true;
                }

                if (!string.IsNullOrWhiteSpace(extracted.ExpiryDate)
                    && DateOnly.TryParse(extracted.ExpiryDate, out var expiry))
                {
                    user.VerifiedPassportExpiryDate = extracted.ExpiryDate;
                    user.VerifiedPassportStatus = expiry < DateOnly.FromDateTime(DateTime.UtcNow)
                        ? Models.PassportStatus.Expired
                        : Models.PassportStatus.Yes;
                    wroteAnything = true;
                }
            }
            else if (document.DocumentType == DocumentType.EducationCertificate)
            {
                if (Enum.TryParse<EducationLevel>(extracted.HighestEducationLevel, out var level))
                {
                    user.VerifiedHighestEducation = level;
                    wroteAnything = true;
                }

                if (!string.IsNullOrWhiteSpace(extracted.FieldOfStudy))
                {
                    user.VerifiedFieldOfStudy = extracted.FieldOfStudy;
                    wroteAnything = true;
                }
            }
            else if (document.DocumentType == DocumentType.LanguageCertificate
                && Enum.TryParse<LanguageLevel>(extracted.CertifiedLevel, out var certifiedLevel))
            {
                if (extracted.CertifiedLanguage == "German")
                {
                    user.VerifiedGermanLevel = certifiedLevel;
                    wroteAnything = true;
                }
                else if (extracted.CertifiedLanguage == "English")
                {
                    user.VerifiedEnglishLevel = certifiedLevel;
                    wroteAnything = true;
                }
            }
        }

        if (wroteAnything)
        {
            user.VerifiedDataUpdatedAt = DateTime.UtcNow;
        }
    }

    // Matches the anonymous object shape serialized in DocumentsEndpoints.cs.
    private record AiExtractedData(
        string DocumentTypeDetected, string IssuerOrInstitution, string ExpiryDate, bool Legible,
        string DateOfBirth, string Nationality, string DocumentNumber,
        string HighestEducationLevel, string FieldOfStudy, string CertifiedLanguage, string CertifiedLevel);

    // Plain-text now (in-app message body, not an HTML email) — replaces
    // the old BuildDecisionEmailHtml, removed 2026-08-27 when this content
    // moved from email into a real Message row. No HTML-encoding needed:
    // the frontend renders this as plain text (React auto-escapes).
    private static (string Subject, string Body) BuildDecisionMessageText(string documentName, DocumentReviewStatus status, string? note)
    {
        var subject = status == DocumentReviewStatus.FlaggedRed
            ? "We need more information about a document you submitted"
            : "Your document needs another look";
        var intro = status == DocumentReviewStatus.FlaggedRed
            ? "One of the documents you submitted couldn't be verified and has been flagged for manual review. Please get in touch so we can resolve it together."
            : "We reviewed the document you submitted and it doesn't currently meet what we need. Please see the note below and consider re-uploading.";

        var body = $"Document: {documentName}\n\n{intro}";
        if (!string.IsNullOrWhiteSpace(note))
        {
            body += $"\n\nNote from our team:\n{note}";
        }

        return (subject, body);
    }
}
