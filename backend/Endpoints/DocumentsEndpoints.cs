using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Models;
using Novira.Backend.Services;

namespace Novira.Backend.Endpoints;

public record UserDocumentResponse(
    Guid Id,
    string Name,
    DocumentType? DocumentType,
    string OriginalFileName,
    DateTime UploadedAt,
    AiVerificationStatus AiVerificationStatus,
    DocumentReviewStatus ReviewStatus,
    DateTime? ReviewedAt,
    string? ReviewNote,
    Guid? SupersedesDocumentId);

// Signed-in-user-facing document upload — the boundary CLAUDE.md's four-level
// user-data model calls Level 2. Session-authenticated (SessionAuthFilter),
// same as GET /matches: any signed-up user, not just the founder.
public static class DocumentsEndpoints
{
    private const long MaxUploadSizeBytes = 10 * 1024 * 1024; // 10 MB
    private static readonly HashSet<string> AllowedContentTypes = ["image/jpeg", "image/png", "application/pdf"];

    // A soft ceiling on total documents per account (built 2026-08-30,
    // alongside self-service document correction) — every upload triggers a
    // real, paid Claude vision call, and re-uploading after a Deny has no
    // cap otherwise. Generous enough for a few honest corrections across a
    // few document types, not so high it stops meaning anything as a real
    // cost/abuse control. A flat per-account cap, not a more elaborate
    // per-document-type attempt limit — fewer moving parts for a problem
    // this already solves well enough at MVP scale.
    private const int MaxDocumentsPerUser = 10;

    private static UserDocumentResponse ToResponse(UserDocument d) => new(
        d.Id, d.Name ?? d.OriginalFileName, d.DocumentType, d.OriginalFileName, d.UploadedAt,
        d.AiVerificationStatus, d.ReviewStatus, d.ReviewedAt, d.ReviewNote, d.SupersedesDocumentId);

    public static void MapDocumentsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/documents").AddEndpointFilter<SessionAuthFilter>();

        group.MapGet("/", async (HttpContext httpContext, AppDbContext db) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;

            var documents = await db.UserDocuments
                .Where(d => d.UserId == user.Id)
                .OrderByDescending(d => d.UploadedAt)
                .ToListAsync();

            return Results.Ok(documents.Select(ToResponse));
        });

        group.MapPost("/", async (
            HttpContext httpContext,
            AppDbContext db,
            AzureBlobStorageService storage,
            DocumentVerificationService verification,
            ILoggerFactory loggerFactory) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;
            var logger = loggerFactory.CreateLogger("Documents");

            // A user with a document already flagged fraudulent is blocked
            // from further self-service uploads until an admin manually
            // clears it (see the comment on User.FraudFlagged) — there is
            // deliberately no self-service unflag path.
            if (user.FraudFlagged)
            {
                // Results.Problem() returns a ProblemDetails body (a `detail`
                // field), but every other error in this file — and the
                // frontend's error handling in lib/api/documents.ts — uses
                // the `{ message }` shape. That mismatch silently dropped
                // this specific reason: the frontend only ever read
                // `body.message`, so a fraud-flagged user just saw a generic
                // "Failed to upload document." with no explanation (found in
                // code review 2026-08-28). Results.Json keeps the same 403
                // status while matching the shape every caller expects.
                return Results.Json(
                    new { message = "Uploads are currently unavailable for this account. Contact support if you believe this is a mistake." },
                    statusCode: StatusCodes.Status403Forbidden);
            }

            var documentCount = await db.UserDocuments.CountAsync(d => d.UserId == user.Id);
            if (documentCount >= MaxDocumentsPerUser)
            {
                return Results.Json(
                    new { message = $"You've reached the limit of {MaxDocumentsPerUser} documents on this account. Contact support if you need to upload more." },
                    statusCode: StatusCodes.Status403Forbidden);
            }

            if (!httpContext.Request.HasFormContentType)
            {
                return Results.BadRequest(new { message = "Expected multipart/form-data." });
            }

            var form = await httpContext.Request.ReadFormAsync();
            var file = form.Files["file"];
            var name = form["name"].ToString().Trim();

            if (string.IsNullOrWhiteSpace(name))
            {
                return Results.BadRequest(new { message = "Please give this document a name." });
            }

            if (name.Length > 200)
            {
                return Results.BadRequest(new { message = "Document name is too long." });
            }

            if (file is null || file.Length == 0)
            {
                return Results.BadRequest(new { message = "No file uploaded." });
            }

            if (file.Length > MaxUploadSizeBytes)
            {
                return Results.BadRequest(new { message = "File is too large (max 10MB)." });
            }

            if (!AllowedContentTypes.Contains(file.ContentType))
            {
                return Results.BadRequest(new { message = "Only JPEG, PNG, and PDF files are supported." });
            }

            // Optional — set only when the user explicitly chose "upload a
            // corrected version" on a specific Denied document (see
            // DocumentsSection.tsx). Validated, not trusted blindly: must be
            // this user's own document, and must currently be Denied — a
            // Pending or Approved document has nothing to "correct" yet, and
            // FlaggedRed already blocks this whole endpoint before this
            // point is ever reached (see the FraudFlagged check above).
            Guid? supersedesDocumentId = null;
            var supersedesRaw = form["supersedesDocumentId"].ToString();
            if (!string.IsNullOrWhiteSpace(supersedesRaw))
            {
                if (!Guid.TryParse(supersedesRaw, out var parsedSupersedesId))
                {
                    return Results.BadRequest(new { message = "Invalid document reference." });
                }

                var supersededDocument = await db.UserDocuments
                    .FirstOrDefaultAsync(d => d.Id == parsedSupersedesId && d.UserId == user.Id);

                if (supersededDocument is null || supersededDocument.ReviewStatus != DocumentReviewStatus.Denied)
                {
                    return Results.BadRequest(new { message = "That document can't be corrected right now." });
                }

                supersedesDocumentId = parsedSupersedesId;
            }

            byte[] fileBytes;
            using (var memoryStream = new MemoryStream())
            {
                await file.CopyToAsync(memoryStream);
                fileBytes = memoryStream.ToArray();
            }

            // DocumentType is deliberately left unset here — the AI
            // determines it below from what the document actually is, not
            // from anything the uploader picked (see the model's comment).
            var document = new UserDocument
            {
                UserId = user.Id,
                Name = name,
                OriginalFileName = file.FileName,
                ContentType = file.ContentType,
                StorageBlobName = string.Empty, // set below, before the row is persisted
                SupersedesDocumentId = supersedesDocumentId,
            };

            using (var uploadStream = new MemoryStream(fileBytes))
            {
                document.StorageBlobName = await storage.UploadAsync(
                    user.Id, document.Id, file.FileName, file.ContentType, uploadStream);
            }

            db.UserDocuments.Add(document);
            await db.SaveChangesAsync();

            // AI verification runs immediately, synchronously — the document
            // is already AI-reviewed by the time a human ever opens it,
            // rather than needing a manual "run AI" trigger. A failure here
            // never loses the upload itself (already saved above); it just
            // leaves the row without AI-extracted data for a human to review
            // manually.
            try
            {
                var result = await verification.VerifyAsync(user.FullName, fileBytes, file.ContentType);

                // Falls back to Other if the model ever returns something
                // outside the four schema-enforced category names — belt
                // and suspenders, since the JSON schema already constrains
                // this via `enum`.
                document.DocumentType = Enum.TryParse<DocumentType>(result.DocumentTypeCategory, out var category)
                    ? category
                    : Models.DocumentType.Other;

                document.AiVerificationStatus = AiVerificationStatus.Completed;
                document.AiExtractedName = result.ExtractedFullName;
                document.AiNameMatchesProfile = result.NameMatchesProfile;
                document.AiSummary = result.Summary;
                document.AiFlagsJson = JsonSerializer.Serialize(result.Concerns);
                document.AiExtractedDataJson = JsonSerializer.Serialize(new
                {
                    result.DocumentTypeDetected,
                    result.IssuerOrInstitution,
                    result.ExpiryDate,
                    result.Legible,
                    result.DateOfBirth,
                    result.Nationality,
                    result.DocumentNumber,
                    result.HighestEducationLevel,
                    result.FieldOfStudy,
                    result.CertifiedLanguage,
                    result.CertifiedLevel,
                });
                document.AiVerifiedAt = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "AI verification failed for document {DocumentId}.", document.Id);
                document.AiVerificationStatus = AiVerificationStatus.Failed;
            }

            await db.SaveChangesAsync();

            return Results.Created($"/documents/{document.Id}", ToResponse(document));
        })
        .RequireRateLimiting("documents-upload");
    }
}
