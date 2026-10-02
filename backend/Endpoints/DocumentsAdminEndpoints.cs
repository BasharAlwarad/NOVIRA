using System.Globalization;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Hubs;
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
    DateTime CreatedAt,
    // What this user can currently unlock — see EffectiveTierCalculator.
    // Added 2026-09-29: a paid user was otherwise invisible anywhere on the
    // admin side, with no way to tell Free and paying users apart at a
    // glance.
    string EffectiveTier);

public record AdminPurchaseResponse(
    Guid Id,
    string Tier,
    int AmountEur,
    string Status,
    DateTime CreatedAt,
    DateTime? RefundedAt);

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
    string? AiOccupationField,
    string? AiCertifiedLanguage,
    string? AiCertifiedLevel,
    List<string> AiFlags,
    string? AiSummary,
    DateTime? AiVerifiedAt,
    DocumentReviewStatus ReviewStatus,
    DateTime? ReviewedAt,
    string? ReviewNote,
    bool RejectionMessageSent,
    // Set only when the user explicitly re-uploaded this as a correction
    // to a specific Denied document (see DocumentsEndpoints.cs). Name is
    // resolved from the same document list already being built where
    // possible (list/detail views); null in the single-document PATCH
    // response, where the frontend's full-refetch-after-review pattern
    // picks it up moments later anyway.
    Guid? SupersedesDocumentId,
    string? SupersedesDocumentName);

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
    string? VerifiedOccupationField,
    bool VerifiedHasCertifiedLanguageProof,
    DateTime? VerifiedDataUpdatedAt,
    // What this user can currently unlock, plus the real purchase ledger it
    // was derived from (newest first) — see EffectiveTierCalculator. Added
    // 2026-09-29: a completed Tier 1 payment had no visibility anywhere on
    // this page.
    string EffectiveTier,
    List<AdminPurchaseResponse> Purchases,
    List<AdminDocumentResponse> Documents,
    // Every message ever sent to this user, newest first — free-text sends
    // and the automatic Deny/FlagRed notices (see the PATCH handler below)
    // both land in the same Messages table, so this is a full audit trail,
    // not just what the admin typed manually. Reuses MessagesEndpoints.cs's
    // MessageResponse rather than duplicating an identical record.
    List<MessageResponse> Messages,
    // The Tier 2 CV-intake profile (work history, education, skills — see
    // IntakeEndpoints.cs), null if the user hasn't started one. Added
    // 2026-10-01 to close a real gap: a CV request showed up in the admin
    // queue with no way to see the actual intake content it's supposed to
    // be built from, anywhere in the admin UI. Reuses
    // IntakeEndpoints.IntakeProfileResponse rather than a second copy.
    IntakeProfileResponse? Intake);

public record ReviewDocumentRequest(DocumentReviewStatus Status, string? Note);
public record SendMessageRequest(string Body);

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

            var purchasesByUser = (await db.Purchases
                .Where(p => userIds.Contains(p.UserId))
                .ToListAsync())
                .GroupBy(p => p.UserId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var items = users
                .Select(u => new AdminUserListItem(
                    u.Id, u.Email, u.FullName, u.VerifiedFullName, u.FraudFlagged,
                    pendingCounts.GetValueOrDefault(u.Id, 0), u.CreatedAt,
                    EffectiveTierCalculator.Compute(purchasesByUser.GetValueOrDefault(u.Id, [])).ToString()))
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
            var purchases = await LoadPurchasesAsync(db, id);
            var intake = await LoadIntakeProfileAsync(db, id);

            return Results.Ok(ToAdminUserDetailResponse(user, documents, messages, purchases, storage, intake));
        });

        group.MapPatch("/{userId:guid}/documents/{documentId:guid}", async (
            Guid userId,
            Guid documentId,
            ReviewDocumentRequest request,
            AppDbContext db,
            ResendEmailService emailService,
            AzureBlobStorageService storage,
            IHubContext<MessagesHub> hub) =>
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
            // User.VerifiedFullName. Re-derived on every review decision
            // (not just Approve) so a document reclassified *away* from
            // Approved (e.g. Approved, then discovered fraudulent and
            // FlaggedRed) stops contributing too — see RecomputeVerifiedData
            // for why a full re-derivation, not an incremental unwind, is
            // how this is closed (found in code review 2026-08-28).
            var otherDocuments = await db.UserDocuments
                .Where(d => d.UserId == userId && d.Id != documentId)
                .ToListAsync();
            RecomputeVerifiedData(user, otherDocuments.Append(document).ToList());

            await db.SaveChangesAsync();

            // Content moves in-app (2026-08-27) — a real Message row, not
            // an emailed HTML body. RejectionMessageSent now tracks whether
            // the content-free notification ping succeeded, not whether the
            // decision itself reached the user: the Message row is always
            // persisted regardless of Resend's availability.
            if (request.Status is DocumentReviewStatus.Denied or DocumentReviewStatus.FlaggedRed)
            {
                var (subject, body) = BuildDecisionMessageText(document.Name ?? document.OriginalFileName, request.Status, request.Note);
                await MessagesEndpoints.CreateAdminMessageAsync(db, hub, user.Id, subject, body);

                document.RejectionMessageSent = await emailService.SendMessageNotificationAsync(user.Email);
                await db.SaveChangesAsync();
            }

            return Results.Ok(ToAdminDocumentResponse(document, storage));
        });

        // Documents approved before ApplyVerifiedDataFromDocument existed
        // (2026-08-16) were never backfilled — see the comment on
        // User.VerifiedFullName. This is the catch-up path: re-derives
        // Verified* data from every currently-Approved document for this
        // user (see RecomputeVerifiedData). Safe to call repeatedly, and
        // also doubles as a manual re-sync if a document's review status
        // was ever changed outside the normal PATCH flow (which now runs
        // the same recompute automatically on every review decision).
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

            var allDocuments = await db.UserDocuments
                .Where(d => d.UserId == id)
                .ToListAsync();
            RecomputeVerifiedData(user, allDocuments);

            await db.SaveChangesAsync();

            var documents = await db.UserDocuments
                .Where(d => d.UserId == id)
                .OrderByDescending(d => d.UploadedAt)
                .ToListAsync();
            var messages = await LoadMessagesAsync(db, id);
            var purchases = await LoadPurchasesAsync(db, id);
            var intake = await LoadIntakeProfileAsync(db, id);

            return Results.Ok(ToAdminUserDetailResponse(user, documents, messages, purchases, storage, intake));
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
        // don't cover. Subject dropped from this form 2026-09-30 — real
        // friction on a quick chat-style reply to a Tier2+ conversation,
        // where the user's own side never has a subject at all (see
        // MessagesEndpoints.cs's POST / and Message.cs's comment). The
        // underlying Message.Subject column stays required — the
        // Deny/FlagRed auto-notices (BuildDecisionMessageText) still carry
        // a real, meaningful subject; only this free-text send gets a
        // fixed generic one.
        group.MapPost("/{userId:guid}/message", async (
            Guid userId,
            SendMessageRequest request,
            AppDbContext db,
            ResendEmailService emailService,
            IHubContext<MessagesHub> hub) =>
        {
            if (string.IsNullOrWhiteSpace(request.Body))
            {
                return Results.BadRequest(new { message = "Message body is required." });
            }

            var user = await db.Users.FindAsync(userId);
            if (user is null)
            {
                return Results.NotFound();
            }

            // Same in-app-first shift as the decision-email branch above —
            // the message is always persisted; `sent` reflects only whether
            // the notification ping succeeded.
            await MessagesEndpoints.CreateAdminMessageAsync(db, hub, user.Id, "Message from our team", request.Body);

            var sent = await emailService.SendMessageNotificationAsync(user.Email);
            return Results.Ok(new { sent });
        });
    }

    private static AdminUserDetailResponse ToAdminUserDetailResponse(
        User user, List<UserDocument> documents, List<Message> messages, List<Purchase> purchases,
        AzureBlobStorageService storage, IntakeProfile? intake) =>
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
            user.VerifiedGermanLevel, user.VerifiedEnglishLevel,
            user.VerifiedOccupationField, user.VerifiedHasCertifiedLanguageProof, user.VerifiedDataUpdatedAt,
            EffectiveTierCalculator.Compute(purchases).ToString(),
            purchases.Select(p => new AdminPurchaseResponse(
                p.Id, p.Tier.ToString(), p.AmountEur, p.Status.ToString(), p.CreatedAt, p.RefundedAt)).ToList(),
            documents.Select(d => ToAdminDocumentResponse(d, storage, documents)).ToList(),
            messages.Select(MessagesEndpoints.ToResponse).ToList(),
            intake is null ? null : IntakeEndpoints.ToResponse(intake));

    private static Task<List<Message>> LoadMessagesAsync(AppDbContext db, Guid userId) =>
        db.Messages.Where(m => m.UserId == userId).OrderByDescending(m => m.CreatedAt).ToListAsync();

    private static Task<List<Purchase>> LoadPurchasesAsync(AppDbContext db, Guid userId) =>
        db.Purchases.Where(p => p.UserId == userId).OrderByDescending(p => p.CreatedAt).ToListAsync();

    private static Task<IntakeProfile?> LoadIntakeProfileAsync(AppDbContext db, Guid userId) =>
        db.IntakeProfiles.FirstOrDefaultAsync(p => p.UserId == userId);

    // allDocuments, when provided, resolves SupersedesDocumentName from the
    // same set already being built (list/detail views) — no extra query.
    // Omitted (null) in the single-document PATCH response, where the
    // frontend's full-refetch-after-review pattern picks the name up
    // moments later regardless.
    private static AdminDocumentResponse ToAdminDocumentResponse(
        UserDocument d, AzureBlobStorageService storage, List<UserDocument>? allDocuments = null)
    {
        string? previewUrl = null;
        try
        {
            previewUrl = storage.GenerateReadSasUri(d.StorageBlobName).AbsoluteUri;
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

        var supersededDocument = d.SupersedesDocumentId is { } supersedesId
            ? allDocuments?.FirstOrDefault(other => other.Id == supersedesId)
            : null;

        return new AdminDocumentResponse(
            d.Id, d.Name ?? d.OriginalFileName, d.DocumentType, d.OriginalFileName, d.ContentType, d.UploadedAt, previewUrl,
            d.AiVerificationStatus, d.AiExtractedName, d.AiNameMatchesProfile,
            extracted?.DocumentTypeDetected, extracted?.IssuerOrInstitution, extracted?.ExpiryDate, extracted?.Legible,
            NullIfEmpty(extracted?.DateOfBirth), NullIfEmpty(extracted?.Nationality), NullIfEmpty(extracted?.DocumentNumber),
            NullIfEmpty(extracted?.HighestEducationLevel), NullIfEmpty(extracted?.FieldOfStudy),
            NullIfEmpty(extracted?.OccupationField),
            NullIfEmpty(extracted?.CertifiedLanguage), NullIfEmpty(extracted?.CertifiedLevel),
            flags, d.AiSummary, d.AiVerifiedAt,
            d.ReviewStatus, d.ReviewedAt, d.ReviewNote, d.RejectionMessageSent,
            d.SupersedesDocumentId, supersededDocument?.Name ?? supersededDocument?.OriginalFileName);
    }

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value;

    // Full re-derivation, not an incremental patch — this is what actually
    // closes the "reclassified after Approve" gap (found in code review
    // 2026-08-28): a document that is no longer Approved (Denied,
    // FlaggedRed, or reverted to PendingReview) must stop contributing to
    // the account's verified data, not just fail to contribute *more* of
    // it. Wiping every Verified* field and re-applying ApplyVerifiedData-
    // FromDocument over the current Approved set (oldest upload first, so
    // "last write wins" for a field multiple documents could set — the
    // same behavior this already had) is simpler and more robust than
    // tracking which document contributed which field for a targeted
    // unwind. Callers pass every document for the user (any status); the
    // Approved filter happens here, once.
    private static void RecomputeVerifiedData(User user, List<UserDocument> allDocuments)
    {
        user.VerifiedFullName = null;
        user.VerifiedDateOfBirth = null;
        user.VerifiedNationality = null;
        user.VerifiedPassportNumber = null;
        user.VerifiedPassportExpiryDate = null;
        user.VerifiedPassportStatus = null;
        user.VerifiedHighestEducation = null;
        user.VerifiedFieldOfStudy = null;
        user.VerifiedGermanLevel = null;
        user.VerifiedEnglishLevel = null;
        user.VerifiedOccupationField = null;
        user.VerifiedHasCertifiedLanguageProof = false;
        user.VerifiedDataUpdatedAt = null;

        var approvedDocuments = allDocuments
            .Where(d => d.ReviewStatus == DocumentReviewStatus.Approved)
            .OrderBy(d => d.UploadedAt)
            .ToList();

        foreach (var document in approvedDocuments)
        {
            ApplyVerifiedDataFromDocument(user, document);
        }
    }

    // The trust-boundary hook — the only place UserDocument's AI-extracted
    // data is ever promoted onto the account, called only from
    // RecomputeVerifiedData above (which only ever passes Approved
    // documents). Never blanks an existing Verified* field with an empty
    // extraction; only writes what this document actually and legibly
    // contained — the wipe that makes reclassification-unwind work happens
    // once, in RecomputeVerifiedData, before any document is (re-)applied.
    // See the comment on User.VerifiedFullName for why promotion itself is
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

                // TryParseExact against the exact ISO format the extraction
                // prompt requests, with InvariantCulture — plain TryParse()
                // uses the server's ambient culture, which could silently
                // fail to parse a perfectly valid AI-extracted date on a
                // non-US-locale server and quietly drop VerifiedPassportStatus
                // with no error anywhere (found in code review 2026-08-28).
                if (!string.IsNullOrWhiteSpace(extracted.ExpiryDate)
                    && DateOnly.TryParseExact(extracted.ExpiryDate, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var expiry))
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

                // OccupationField is an exact-match hard filter in
                // MatchingService, so defense in depth here matters as much
                // as it does for SourceUrl trust elsewhere in this app:
                // even though the extraction schema already constrains the
                // AI to OccupationFields.All via `enum`, re-validate against
                // the same canonical set server-side before ever promoting
                // it onto the account — never trust a single layer for a
                // hard filter. A value that somehow isn't a real key is
                // dropped, not guessed at or coerced (added 2026-09-11, see
                // User.VerifiedOccupationField's own comment for why this
                // field exists at all).
                if (!string.IsNullOrWhiteSpace(extracted.OccupationField)
                    && OccupationFields.Valid.Contains(extracted.OccupationField))
                {
                    user.VerifiedOccupationField = extracted.OccupationField;
                    wroteAnything = true;
                }
            }
            else if (document.DocumentType == DocumentType.LanguageCertificate)
            {
                // The document type itself (already human-approved) is the
                // actual proof of "holds a certified language exam result"
                // — MatchingService's soft-factor bonus (added 2026-09-11)
                // just needs to know one exists, independent of whether the
                // specific level below parsed cleanly. Never reset to false
                // here — only RecomputeVerifiedData's initial wipe does
                // that, so this stays correctly cumulative across multiple
                // approved certificates (e.g. one German, one English).
                user.VerifiedHasCertifiedLanguageProof = true;
                wroteAnything = true;

                if (Enum.TryParse<LanguageLevel>(extracted.CertifiedLevel, out var certifiedLevel))
                {
                    if (extracted.CertifiedLanguage == "German")
                    {
                        user.VerifiedGermanLevel = certifiedLevel;
                    }
                    else if (extracted.CertifiedLanguage == "English")
                    {
                        user.VerifiedEnglishLevel = certifiedLevel;
                    }
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
        string HighestEducationLevel, string FieldOfStudy, string OccupationField,
        string CertifiedLanguage, string CertifiedLevel);

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
            : "We reviewed the document you submitted and it doesn't currently meet what we need. Please see the note below, then go to your account and use \"Upload a corrected version\" on this document to send us a fixed one.";

        var body = $"Document: {documentName}\n\n{intro}";
        if (!string.IsNullOrWhiteSpace(note))
        {
            body += $"\n\nNote from our team:\n{note}";
        }

        return (subject, body);
    }
}
