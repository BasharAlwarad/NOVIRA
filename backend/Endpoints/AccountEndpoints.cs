using Novira.Backend.Data;
using Novira.Backend.Models;
using Novira.Backend.Services;

namespace Novira.Backend.Endpoints;

// Mirrors the self-reported profile fields already sent to the admin review
// UI (AdminUserDetailResponse) minus the admin-only fraud-review fields —
// this is the user's own view of their own data.
public record AccountResponse(
    Guid Id,
    string Email,
    string? FullName,
    DateTime CreatedAt,
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
    // Level 3 — populated only once an admin Approves a document that
    // contained this data (see DocumentsAdminEndpoints.cs's
    // ApplyVerifiedDataFromDocument).
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
    DateTime? VerifiedDataUpdatedAt);

// The self-service counterpart to DocumentsAdminEndpoints — a signed-in
// user's own view of their account, plus account deletion. Session-
// authenticated like /documents and /matches, not admin-key protected.
public static class AccountEndpoints
{
    public static void MapAccountEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/account").AddEndpointFilter<SessionAuthFilter>();

        group.MapGet("/", (HttpContext httpContext) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;
            return Results.Ok(new AccountResponse(
                user.Id, user.Email, user.FullName, user.CreatedAt,
                user.Country, user.Age, user.HighestEducation, user.OccupationField,
                user.WorkExperience, user.DesiredPath, user.GermanLevel, user.EnglishLevel,
                user.LanguageCertificate, user.PassportStatus, user.GermanyConnection,
                user.FinancialSituation, user.StartTimeline, user.RegionFlexibility,
                user.ProfileUpdatedAt,
                user.VerifiedFullName, user.VerifiedDateOfBirth, user.VerifiedNationality,
                user.VerifiedPassportNumber, user.VerifiedPassportExpiryDate, user.VerifiedPassportStatus,
                user.VerifiedHighestEducation, user.VerifiedFieldOfStudy,
                user.VerifiedGermanLevel, user.VerifiedEnglishLevel, user.VerifiedDataUpdatedAt));
        });

        // Closes a real gap found live 2026-08-30: every other profile-
        // capture path (POST /leads, POST /auth/request-link + /auth/verify)
        // only ever sends a profile at *sign-in time*. A user who signs in
        // FIRST (no profile yet) and only completes the assessment
        // afterward, while already signed in, had no path back — the
        // result page's SignupPrompt correctly detects an existing session
        // and shows "you're signed in, view your matches" instead of
        // re-authenticating, so the freshly-computed profile was silently
        // never sent anywhere. This endpoint is that missing path: apply
        // the current local profile straight onto the already-authenticated
        // account, no token/re-verification needed since ownership is
        // already proven by the session itself. Same overwrite-on-every-
        // capture semantics as every other profile write (ApplyTo, Program.cs).
        group.MapPost("/profile", async (HttpContext httpContext, ProfileSnapshot request, AppDbContext db) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;
            request.ApplyTo(user);
            await db.SaveChangesAsync();

            return Results.Ok(new { hasProfile = user.ProfileUpdatedAt is not null });
        });

        // Full deletion, not a soft-delete flag — the FK cascade (Sessions,
        // MagicLinkTokens, UserDocuments -> Users, ON DELETE CASCADE) was
        // already tested clean during the auth-system build, so this is a
        // real, complete removal, not a placeholder. Blob cleanup is
        // best-effort and never blocks the DB deletion (see the comment on
        // DeleteAllForUserAsync).
        group.MapDelete("/", async (
            HttpContext httpContext,
            AppDbContext db,
            AzureBlobStorageService storage,
            ILoggerFactory loggerFactory) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;
            var logger = loggerFactory.CreateLogger("Account");

            try
            {
                await storage.DeleteAllForUserAsync(user.Id);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to delete blob storage files for user {UserId} during account deletion.", user.Id);
            }

            db.Users.Remove(user);
            await db.SaveChangesAsync();

            return Results.NoContent();
        });
    }
}
