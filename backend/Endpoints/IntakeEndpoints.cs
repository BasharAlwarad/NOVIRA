using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Models;
using Novira.Backend.Services;

namespace Novira.Backend.Endpoints;

public record IntakeProfileResponse(
    Guid Id,
    string? PhoneNumber,
    string? Address,
    bool HasPhoto,
    string? DateOfBirth,
    string? Summary,
    List<IntakeExperienceEntry> Experience,
    List<IntakeEducationEntry> Education,
    string? TechnicalSkills,
    bool DrivingLicence,
    string? Certifications,
    string? Hobbies,
    IntakeStatus Status,
    DateTime? UpdatedAt);

// A one-time starter suggestion for a blank form, built only from data this
// app already trusts (Verified* fields, or an Approved document's own
// extraction) — never from anything still PendingReview. Only ever returned
// when no IntakeProfile row exists yet; once one exists, saved answers are
// the only source of truth and this is never recomputed over top of them.
public record IntakePrefillResponse(
    string? FullName,
    string? DateOfBirth,
    string? Nationality,
    EducationLevel? HighestEducation,
    string? FieldOfStudy,
    // Read live off the user's own Approved EducationCertificate document
    // (UserDocument.AiExtractedDataJson's IssuerOrInstitution), not a
    // promoted User column — see Architecture.md's intake-form design note
    // for why this one field is deliberately not a new VerifiedInstitutionName.
    string? InstitutionName,
    LanguageLevel? GermanLevel,
    LanguageLevel? EnglishLevel,
    bool HasCertifiedLanguageProof);

public record IntakeGetResponse(IntakeProfileResponse? Profile, IntakePrefillResponse? Prefill);

public record SaveIntakeRequest(
    string? PhoneNumber,
    string? Address,
    string? DateOfBirth,
    string? Summary,
    List<IntakeExperienceEntry> Experience,
    List<IntakeEducationEntry> Education,
    string? TechnicalSkills,
    bool DrivingLicence,
    string? Certifications,
    string? Hobbies);

// The Tier 2 CV-generation intake form's backend (Architecture.md's "Tier 2
// services" section, step 1). Session-authenticated like /documents and
// /account — deliberately NOT tier-gated: any signed-up user can fill this
// in, same "free to contribute, paid to act on" shape as document upload.
// Only the later "request a CV" action (not built yet) checks Tier2+.
public static class IntakeEndpoints
{
    private const long MaxPhotoSizeBytes = 5 * 1024 * 1024; // 5 MB
    private static readonly HashSet<string> AllowedPhotoContentTypes = ["image/jpeg", "image/png"];

    private const int MaxTextFieldLength = 4000;
    private const int MaxEntriesPerSection = 20;
    private const int MaxBulletsPerEntry = 15;
    private const int MaxBulletLength = 500;

    public static void MapIntakeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/intake").AddEndpointFilter<SessionAuthFilter>();

        group.MapGet("/", async (HttpContext httpContext, AppDbContext db) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;
            var profile = await db.IntakeProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id);

            if (profile is not null)
            {
                return Results.Ok(new IntakeGetResponse(ToResponse(profile), null));
            }

            var prefill = await BuildPrefillAsync(user, db);
            return Results.Ok(new IntakeGetResponse(null, prefill));
        });

        group.MapPut("/", async (SaveIntakeRequest request, HttpContext httpContext, AppDbContext db) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;

            if (!IsWithinSizeLimits(request, out var sizeError))
            {
                return Results.BadRequest(new { message = sizeError });
            }

            var profile = await db.IntakeProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id);
            if (profile is null)
            {
                profile = new IntakeProfile { UserId = user.Id };
                db.IntakeProfiles.Add(profile);
            }

            profile.PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim();
            profile.Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim();
            profile.DateOfBirth = string.IsNullOrWhiteSpace(request.DateOfBirth) ? null : request.DateOfBirth.Trim();
            profile.Summary = string.IsNullOrWhiteSpace(request.Summary) ? null : request.Summary.Trim();
            profile.ExperienceJson = JsonSerializer.Serialize(request.Experience);
            profile.EducationJson = JsonSerializer.Serialize(request.Education);
            profile.TechnicalSkills = string.IsNullOrWhiteSpace(request.TechnicalSkills) ? null : request.TechnicalSkills.Trim();
            profile.DrivingLicence = request.DrivingLicence;
            profile.Certifications = string.IsNullOrWhiteSpace(request.Certifications) ? null : request.Certifications.Trim();
            profile.Hobbies = string.IsNullOrWhiteSpace(request.Hobbies) ? null : request.Hobbies.Trim();

            // A Submitted profile that's edited again drops back to
            // InProgress — an edit after submitting means the case isn't
            // actually in its "ready for review" state anymore. NotStarted
            // -> InProgress on the very first save either way.
            if (profile.Status is IntakeStatus.NotStarted or IntakeStatus.Submitted)
            {
                profile.Status = IntakeStatus.InProgress;
            }
            profile.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();

            return Results.Ok(ToResponse(profile));
        });

        // A distinct explicit action, not just "the last save" — gives the
        // admin side a real, visible signal of "waiting on us" vs. "still
        // being filled in," per Architecture.md's case-status reasoning.
        group.MapPost("/submit", async (HttpContext httpContext, AppDbContext db) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;
            var profile = await db.IntakeProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id);
            if (profile is null)
            {
                return Results.BadRequest(new { message = "Fill in your details before submitting." });
            }

            profile.Status = IntakeStatus.Submitted;
            profile.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            return Results.Ok(ToResponse(profile));
        });

        group.MapPost("/photo", async (
            HttpContext httpContext,
            AppDbContext db,
            AzureBlobStorageService storage) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;

            if (!httpContext.Request.HasFormContentType)
            {
                return Results.BadRequest(new { message = "Expected multipart/form-data." });
            }

            var form = await httpContext.Request.ReadFormAsync();
            var file = form.Files["file"];

            if (file is null || file.Length == 0)
            {
                return Results.BadRequest(new { message = "No file uploaded." });
            }
            if (file.Length > MaxPhotoSizeBytes)
            {
                return Results.BadRequest(new { message = "Photo is too large (max 5MB)." });
            }
            if (!AllowedPhotoContentTypes.Contains(file.ContentType))
            {
                return Results.BadRequest(new { message = "Only JPEG and PNG photos are supported." });
            }

            var profile = await db.IntakeProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id);
            if (profile is null)
            {
                profile = new IntakeProfile { UserId = user.Id };
                db.IntakeProfiles.Add(profile);
            }

            using (var uploadStream = file.OpenReadStream())
            {
                profile.PhotoBlobName = await storage.UploadIntakePhotoAsync(user.Id, file.ContentType, uploadStream);
            }
            profile.PhotoContentType = file.ContentType;
            profile.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();

            return Results.Ok(ToResponse(profile));
        })
        .RequireRateLimiting("documents-upload");

        group.MapGet("/photo", async (HttpContext httpContext, AppDbContext db, AzureBlobStorageService storage) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;
            var profile = await db.IntakeProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id);

            if (profile?.PhotoBlobName is null)
            {
                return Results.NotFound();
            }

            var sasUri = storage.GenerateReadSasUri(profile.PhotoBlobName);
            return Results.Ok(new { url = sasUri.AbsoluteUri });
        });

        group.MapDelete("/photo", async (HttpContext httpContext, AppDbContext db, AzureBlobStorageService storage) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;
            var profile = await db.IntakeProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id);

            if (profile?.PhotoBlobName is not null)
            {
                await storage.DeleteBlobIfExistsAsync(profile.PhotoBlobName);
                profile.PhotoBlobName = null;
                profile.PhotoContentType = null;
                profile.UpdatedAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
            }

            return Results.NoContent();
        });
    }

    private static async Task<IntakePrefillResponse?> BuildPrefillAsync(User user, AppDbContext db)
    {
        string? institutionName = null;

        var approvedEducationDoc = await db.UserDocuments
            .Where(d => d.UserId == user.Id
                && d.DocumentType == DocumentType.EducationCertificate
                && d.ReviewStatus == DocumentReviewStatus.Approved)
            .OrderByDescending(d => d.UploadedAt)
            .FirstOrDefaultAsync();

        if (approvedEducationDoc is not null && !string.IsNullOrWhiteSpace(approvedEducationDoc.AiExtractedDataJson))
        {
            using var extractedJson = JsonDocument.Parse(approvedEducationDoc.AiExtractedDataJson);
            if (extractedJson.RootElement.TryGetProperty("IssuerOrInstitution", out var institutionProp)
                && institutionProp.GetString() is { Length: > 0 } institutionValue)
            {
                institutionName = institutionValue;
            }
        }

        var prefill = new IntakePrefillResponse(
            user.VerifiedFullName,
            user.VerifiedDateOfBirth,
            user.VerifiedNationality,
            user.VerifiedHighestEducation,
            user.VerifiedFieldOfStudy,
            institutionName,
            user.VerifiedGermanLevel,
            user.VerifiedEnglishLevel,
            user.VerifiedHasCertifiedLanguageProof);

        var hasAnyValue = prefill.FullName is not null || prefill.DateOfBirth is not null
            || prefill.Nationality is not null || prefill.HighestEducation is not null
            || prefill.FieldOfStudy is not null || prefill.InstitutionName is not null
            || prefill.GermanLevel is not null || prefill.EnglishLevel is not null
            || prefill.HasCertifiedLanguageProof;

        return hasAnyValue ? prefill : null;
    }

    // Public — reused by DocumentsAdminEndpoints.cs so the admin user-detail
    // view can show the same shape instead of a second, drifting copy.
    public static IntakeProfileResponse ToResponse(IntakeProfile p) => new(
        p.Id, p.PhoneNumber, p.Address, p.PhotoBlobName is not null, p.DateOfBirth, p.Summary,
        JsonSerializer.Deserialize<List<IntakeExperienceEntry>>(p.ExperienceJson) ?? [],
        JsonSerializer.Deserialize<List<IntakeEducationEntry>>(p.EducationJson) ?? [],
        p.TechnicalSkills, p.DrivingLicence, p.Certifications, p.Hobbies, p.Status, p.UpdatedAt);

    // Coarse caps, same spirit as DocumentsEndpoints.cs's IsWithinSizeLimits
    // — this is a signed-in, non-anonymous surface, not attacker-facing
    // input, but still capped so nobody can push megabytes of text into a
    // jsonb column by mistake or otherwise.
    private static bool IsWithinSizeLimits(SaveIntakeRequest request, out string? error)
    {
        error = null;

        if ((request.PhoneNumber?.Length ?? 0) > 100) { error = "Phone number is too long."; return false; }
        if ((request.Address?.Length ?? 0) > 300) { error = "Address is too long."; return false; }
        if ((request.DateOfBirth?.Length ?? 0) > 50) { error = "Date of birth is too long."; return false; }
        if ((request.Summary?.Length ?? 0) > MaxTextFieldLength) { error = "Summary is too long."; return false; }
        if ((request.TechnicalSkills?.Length ?? 0) > MaxTextFieldLength) { error = "Skills list is too long."; return false; }
        if ((request.Certifications?.Length ?? 0) > MaxTextFieldLength) { error = "Certifications are too long."; return false; }
        if ((request.Hobbies?.Length ?? 0) > MaxTextFieldLength) { error = "Hobbies are too long."; return false; }

        if (request.Experience.Count > MaxEntriesPerSection || request.Education.Count > MaxEntriesPerSection)
        {
            error = $"No more than {MaxEntriesPerSection} entries allowed per section.";
            return false;
        }

        foreach (var entry in request.Experience)
        {
            if (entry.Bullets.Count > MaxBulletsPerEntry || entry.Bullets.Any(b => b.Length > MaxBulletLength))
            {
                error = "One of your experience entries has too many or too-long bullet points.";
                return false;
            }
        }

        return true;
    }
}
