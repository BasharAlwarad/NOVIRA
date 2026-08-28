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
    string? ReviewNote);

// Signed-in-user-facing document upload — the boundary CLAUDE.md's four-level
// user-data model calls Level 2. Session-authenticated (SessionAuthFilter),
// same as GET /matches: any signed-up user, not just the founder.
public static class DocumentsEndpoints
{
    private const long MaxUploadSizeBytes = 10 * 1024 * 1024; // 10 MB
    private static readonly HashSet<string> AllowedContentTypes = ["image/jpeg", "image/png", "application/pdf"];

    private static UserDocumentResponse ToResponse(UserDocument d) => new(
        d.Id, d.Name ?? d.OriginalFileName, d.DocumentType, d.OriginalFileName, d.UploadedAt,
        d.AiVerificationStatus, d.ReviewStatus, d.ReviewedAt, d.ReviewNote);

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
                return Results.Problem(
                    "Uploads are currently unavailable for this account. Contact support if you believe this is a mistake.",
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
