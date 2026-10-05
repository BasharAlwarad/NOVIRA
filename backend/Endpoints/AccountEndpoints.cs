using System.Net;
using System.Text;
using Microsoft.EntityFrameworkCore;
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
    string? VerifiedOccupationField,
    bool VerifiedHasCertifiedLanguageProof,
    DateTime? VerifiedDataUpdatedAt,
    // What this user can currently unlock — see EffectiveTierCalculator.
    // Surfaced here (not a separate endpoint) since "my account" is where
    // tier/unlock status was asked to live.
    string EffectiveTier,
    // Non-null while the account-deletion cooling-off window is active —
    // see the deletion endpoints below. The frontend uses this to show a
    // "scheduled for deletion, cancel?" state instead of the normal account
    // view.
    DateTime? DeletionScheduledFor);

public record DeleteRequestRequest(string? Reason);
public record DeleteRequestResponse(bool EmailSent);
public record ConfirmDeleteRequest(string Token, string TypedConfirmation);
public record ConfirmDeleteResponse(DateTime ScheduledFor);

// The self-service counterpart to DocumentsAdminEndpoints — a signed-in
// user's own view of their account, plus account deletion. Session-
// authenticated like /documents and /matches, not admin-key protected.
public static class AccountEndpoints
{
    public static void MapAccountEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/account").AddEndpointFilter<SessionAuthFilter>();

        group.MapGet("/", async (HttpContext httpContext, AppDbContext db) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;
            var purchases = await db.Purchases.Where(p => p.UserId == user.Id).ToListAsync();
            var effectiveTier = EffectiveTierCalculator.Compute(purchases);

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
                user.VerifiedGermanLevel, user.VerifiedEnglishLevel,
                user.VerifiedOccupationField, user.VerifiedHasCertifiedLanguageProof, user.VerifiedDataUpdatedAt,
                effectiveTier.ToString(), user.DeletionScheduledFor));
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

        // The account-deletion cooling-off flow (built 2026-10-04,
        // replacing the old immediate self-service delete) — three steps,
        // deliberately more friction than a single click for something
        // irreversible:
        //
        // 1. /delete-request (here, session-authenticated): captures why
        //    they're leaving (optional — asking should never be what blocks
        //    someone from leaving) and emails a single-purpose confirmation
        //    link. Nothing is written to the User row yet, same "don't act
        //    until ownership is re-proven" discipline as the magic-link
        //    PendingProfileJson fix.
        // 2. /confirm-delete (public — the token itself is the
        //    authentication, same as /auth/verify): requires the user to
        //    have typed their own email as a last, deliberate checkpoint,
        //    not just clicked a link. Only THIS actually schedules the
        //    deletion (7 days out) and signs the account out everywhere.
        // 3. /cancel-deletion (session-authenticated): any time before the
        //    7 days elapse, signing back in and cancelling clears it. No
        //    separate "confirm immediately" endpoint exists — the real,
        //    permanent deletion is a lazy sweep (AuthEndpoints.cs's
        //    /auth/verify for this specific user, and GET /admin/users in
        //    bulk) since this app has no scheduler infrastructure.
        group.MapPost("/delete-request", async (
            DeleteRequestRequest request,
            HttpContext httpContext,
            AppDbContext db,
            IConfiguration configuration,
            ResendEmailService emailService,
            ILoggerFactory loggerFactory,
            IHostEnvironment hostEnvironment) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;
            var logger = loggerFactory.CreateLogger("Account");

            var rawToken = TokenGenerator.GenerateRawToken();
            db.AccountDeletionTokens.Add(new AccountDeletionToken
            {
                UserId = user.Id,
                TokenHash = TokenGenerator.Hash(rawToken),
                ExpiresAt = DateTime.UtcNow.AddMinutes(30),
                Reason = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim(),
            });
            await db.SaveChangesAsync();

            if (hostEnvironment.IsDevelopment())
            {
                logger.LogInformation(
                    "[DEV ONLY] Account deletion confirm link for {Email}: {BaseUrl}/account/confirm-delete?token={Token}",
                    user.Email, configuration["Frontend:BaseUrl"] ?? "http://localhost:3000", rawToken);
            }

            var emailSent = await SendDeletionConfirmEmailAsync(user.Email, rawToken, configuration, emailService);

            return Results.Ok(new DeleteRequestResponse(emailSent));
        });

        // Deliberately outside the session-authenticated group — the
        // deletion token itself is the proof of ownership here, exactly
        // like /auth/verify's magic link. A signed-out browser (this flow
        // already signed the user out nowhere yet, but the email link could
        // land in a different browser/device entirely) must still be able
        // to complete this.
        app.MapPost("/account/confirm-delete", async (
            ConfirmDeleteRequest request,
            AppDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.Token))
            {
                return Results.BadRequest(new { message = "This link is invalid or has expired." });
            }

            var tokenHash = TokenGenerator.Hash(request.Token);

            // Validate first, claim second — found live during verification:
            // claiming the token (marking it single-use) before checking the
            // typed confirmation meant one mistyped email permanently burned
            // the link, forcing the user to restart the entire email round
            // trip over a typo. A read-only lookup here, with the atomic
            // claim moved after the typed-confirmation check, lets a wrong
            // guess be retried with the same link while still closing the
            // race a concurrent *correct* submission could hit (the
            // ExecuteUpdateAsync below still only lets one caller through).
            var pendingToken = await db.AccountDeletionTokens
                .FirstOrDefaultAsync(t => t.TokenHash == tokenHash && t.UsedAt == null && t.ExpiresAt >= DateTime.UtcNow);
            if (pendingToken is null)
            {
                return Results.BadRequest(new { message = "This link is invalid or has expired." });
            }

            var user = await db.Users.FindAsync(pendingToken.UserId);
            if (user is null)
            {
                return Results.BadRequest(new { message = "This link is invalid or has expired." });
            }

            // The last deliberate checkpoint — typing the account's own
            // email is harder to do by accident than clicking a button, and
            // can't be satisfied by a script that only has the link.
            if (!string.Equals(request.TypedConfirmation.Trim(), user.Email, StringComparison.OrdinalIgnoreCase))
            {
                return Results.BadRequest(new { message = "That doesn't match your account email." });
            }

            var rowsAffected = await db.AccountDeletionTokens
                .Where(t => t.TokenHash == tokenHash && t.UsedAt == null && t.ExpiresAt >= DateTime.UtcNow)
                .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.UsedAt, DateTime.UtcNow));
            if (rowsAffected == 0)
            {
                return Results.BadRequest(new { message = "This link is invalid or has expired." });
            }

            var token = pendingToken;
            var now = DateTime.UtcNow;
            user.DeletionRequestedAt = now;
            user.DeletionScheduledFor = now.AddDays(7);
            user.DeletionReason = token.Reason;

            // Real sign-out everywhere, not just this browser — matches the
            // agreed flow ("signs out of all sessions").
            var sessions = await db.Sessions.Where(s => s.UserId == user.Id).ToListAsync();
            db.Sessions.RemoveRange(sessions);

            await db.SaveChangesAsync();

            return Results.Ok(new ConfirmDeleteResponse(user.DeletionScheduledFor.Value));
        });

        group.MapPost("/cancel-deletion", async (HttpContext httpContext, AppDbContext db) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;
            user.DeletionRequestedAt = null;
            user.DeletionScheduledFor = null;
            user.DeletionReason = null;
            await db.SaveChangesAsync();

            return Results.Ok(new { cancelled = true });
        });
    }

    private static async Task<bool> SendDeletionConfirmEmailAsync(
        string email, string rawToken, IConfiguration configuration, ResendEmailService emailService)
    {
        var frontendBaseUrl = configuration["Frontend:BaseUrl"] ?? "http://localhost:3000";
        var confirmUrl = $"{frontendBaseUrl}/account/confirm-delete?token={Uri.EscapeDataString(rawToken)}";
        var encodedUrl = WebUtility.HtmlEncode(confirmUrl);

        // Same table-based, inline-styled layout discipline as
        // AuthEndpoints.cs's BuildMagicLinkEmailHtml — desktop Outlook
        // renders with Word's engine and ignores flexbox/grid/CSS classes.
        var sb = new StringBuilder();
        sb.Append("<div style=\"background:#f8fafc;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;\">");
        sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:480px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;\">");
        sb.Append("<tr><td style=\"background:#020617;padding:28px 32px;\">");
        sb.Append("<p style=\"margin:0;font-size:13px;font-weight:700;letter-spacing:4px;color:#f87171;\">NOVIRA</p>");
        sb.Append("</td></tr>");
        sb.Append("<tr><td style=\"padding:32px;text-align:center;\">");
        sb.Append("<h1 style=\"margin:0 0 12px;font-size:20px;color:#020617;\">Confirm account deletion</h1>");
        sb.Append("<p style=\"margin:0 0 24px;font-size:14px;line-height:1.6;color:#475569;\">Click below to confirm. Your account won't be deleted immediately — you'll have 7 days to change your mind by signing back in. This link expires in 30 minutes and can only be used once.</p>");
        sb.Append("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin:0 auto;\"><tr>");
        sb.Append($"<td style=\"border-radius:999px;background:#f87171;\"><a href=\"{encodedUrl}\" style=\"display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#020617;text-decoration:none;border-radius:999px;\">Confirm deletion</a></td>");
        sb.Append("</tr></table>");
        sb.Append("<p style=\"margin:20px 0 0;font-size:12px;color:#94a3b8;\">If you didn&rsquo;t request this, you can safely ignore this email — your account is unaffected.</p>");
        sb.Append("</td></tr>");
        sb.Append("</table></div>");

        return await emailService.SendAsync(email, "Confirm your NOVIRA account deletion", sb.ToString());
    }
}
