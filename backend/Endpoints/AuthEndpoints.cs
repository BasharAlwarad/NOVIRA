using System.Net;
using System.Net.Http.Json;
using System.Net.Mail;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Models;
using Novira.Backend.Services;

namespace Novira.Backend.Endpoints;

// Profile is optional — verifying an email doesn't require a completed
// assessment — but when it's present (the normal case: requesting a link
// straight off the result page, same as /leads), it eventually gets
// captured onto the Users row the same way /leads does. Without this, a
// user who signs up via SignupPrompt without ever using SaveResultPrompt
// first would land on a Users row with an empty profile, which then makes
// /matches' MatchingService hard filters correctly find nothing — a real
// bug fixed 2026-08-16: /opportunity-counts recomputes counts fresh from
// the in-browser answers every time, so it looked fine even though the
// persisted row backing /matches was empty.
//
// IMPORTANT (fixed 2026-08-28, found in code review): the profile is NOT
// applied to the User row here. It's held on the MagicLinkToken
// (PendingProfileJson) and only applied inside /auth/verify, after the
// token has actually been consumed — i.e. after whoever clicked the link
// has proven they own the inbox it was emailed to. The original version
// applied it immediately at request time, which meant anyone who merely
// knew a victim's email could silently overwrite their stored profile
// (feeding real /matches results) without ever proving ownership.
public record RequestLinkRequest(string Email, ProfileSnapshot? Profile);
public record RequestLinkResponse(bool EmailSent);
public record VerifyRequest(string Token);
public record VerifyResponse(string SessionToken, string Email);
public record MeResponse(string Email);

/// <summary>
/// The account-signup boundary from Plan.md §4 — free, email-only,
/// magic-link auth. No password anywhere (avoids storing/hashing a whole
/// second class of secret) and no full ASP.NET Core Identity (would pull in
/// its own UserManager/SignInManager/migrations for a User model that
/// already has a real custom shape — see Matching-Algorithm-Study.md §8-
/// adjacent reasoning in CLAUDE.md's auth section). Two DB-backed token
/// kinds, both hashed at rest per OWASP's Forgot Password Cheat Sheet
/// (never store the raw bearer secret): MagicLinkToken (15 min, single-use,
/// proves email ownership) and Session (30 days, created only after a
/// successful verify, proves "logged in" — real DB rows so logout is a real
/// revocation, not just a client-side cookie clear).
///
/// The backend never sets a browser cookie directly — it returns the raw
/// session token in the JSON body, and only the Next.js Route Handler
/// (frontend/src/app/api/auth/verify/route.ts) turns that into the actual
/// HttpOnly/Secure/SameSite=Lax cookie, same "browser never talks to the
/// backend directly" rule the rest of the app already follows.
/// </summary>
public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/auth");

        group.MapPost("/request-link", async (
            RequestLinkRequest request,
            AppDbContext db,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILoggerFactory loggerFactory,
            IHostEnvironment hostEnvironment) =>
        {
            var logger = loggerFactory.CreateLogger("Auth");

            if (!MailAddress.TryCreate(request.Email, out var parsedEmail))
            {
                return Results.BadRequest(new { message = "Invalid email address." });
            }

            // Same normalize-and-upsert behavior as /leads — requesting a
            // link doesn't require having gone through email capture first;
            // it just proves ownership of whatever email is given, landing
            // on the same Users row either way (one identity, not a
            // separate "auth users" table).
            var normalizedEmail = parsedEmail.Address.Trim().ToLowerInvariant();

            try
            {
                var user = await db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
                if (user is null)
                {
                    user = new User { Email = normalizedEmail };
                    db.Users.Add(user);
                    await db.SaveChangesAsync();
                }

                // Only the most recently requested link should ever work —
                // invalidate anything still outstanding for this user.
                var priorTokens = await db.MagicLinkTokens
                    .Where(t => t.UserId == user.Id && t.UsedAt == null)
                    .ToListAsync();
                db.MagicLinkTokens.RemoveRange(priorTokens);

                // The profile is deliberately NOT written to `user` here —
                // see the doc comment on RequestLinkRequest above. It rides
                // along on the token and is only applied once the token is
                // actually consumed at /auth/verify, after ownership of this
                // inbox is proven.
                var rawToken = TokenGenerator.GenerateRawToken();
                db.MagicLinkTokens.Add(new MagicLinkToken
                {
                    UserId = user.Id,
                    TokenHash = TokenGenerator.Hash(rawToken),
                    ExpiresAt = DateTime.UtcNow.AddMinutes(15),
                    PendingProfileJson = request.Profile is { } profile ? JsonSerializer.Serialize(profile) : null,
                });
                await db.SaveChangesAsync();

                // Dev-only convenience so the flow is testable without a
                // working Resend account in every local session — never
                // fires outside Development, and never touches the actual
                // response body (which is identical in every environment).
                if (hostEnvironment.IsDevelopment())
                {
                    logger.LogInformation(
                        "[DEV ONLY] Magic link for {Email}: {BaseUrl}/auth/verify?token={Token}",
                        normalizedEmail, configuration["Frontend:BaseUrl"] ?? "http://localhost:3000", rawToken);
                }

                var emailSent = await SendMagicLinkEmailAsync(
                    normalizedEmail, rawToken, httpClientFactory.CreateClient(), configuration, logger);

                // Reporting true delivery status here does NOT leak whether
                // the email already had an account (the account is upserted
                // regardless, and Resend succeeding/failing is independent
                // of that) — it only reports on this app's own email
                // infrastructure, same non-enumeration-risk reasoning /leads
                // already relies on for its own emailSent field. A
                // misconfigured/down Resend must be visible here, not
                // silently swallowed — that's the whole delivery mechanism
                // for this token, unlike /leads where the DB save succeeds
                // independent of email.
                return Results.Ok(new RequestLinkResponse(EmailSent: emailSent));
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to process magic link request.");
                return Results.Problem("Something went wrong. Please try again.", statusCode: 500);
            }
        })
        .RequireRateLimiting("auth-request-link");

        group.MapPost("/verify", async (VerifyRequest request, AppDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.Token))
            {
                return Results.BadRequest(new { message = "This link is invalid or has expired." });
            }

            var tokenHash = TokenGenerator.Hash(request.Token);

            // Atomic conditional UPDATE, not read-then-write — closes a real
            // race where two concurrent verify calls for the same token
            // could both read UsedAt==null before either write finishes.
            // Known real trigger: some corporate email gateways/clients
            // pre-fetch links to scan them for phishing before the real
            // user ever clicks, which can race (or outright consume) a
            // single-use link ahead of the legitimate click. Only the
            // caller whose UPDATE actually matches a row (rowsAffected == 1)
            // may proceed — a second caller racing the same token gets 0
            // rows affected and fails, same as an already-used token.
            var rowsAffected = await db.MagicLinkTokens
                .Where(t => t.TokenHash == tokenHash && t.UsedAt == null && t.ExpiresAt >= DateTime.UtcNow)
                .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.UsedAt, DateTime.UtcNow));

            // One generic failure message regardless of *why* — expired,
            // already-used, never-existed, and lost-the-race all look
            // identical to the caller, so none of those states leak
            // information.
            if (rowsAffected == 0)
            {
                return Results.BadRequest(new { message = "This link is invalid or has expired." });
            }

            var magicLinkToken = await db.MagicLinkTokens.FirstAsync(t => t.TokenHash == tokenHash);
            var user = await db.Users.FindAsync(magicLinkToken.UserId);
            if (user is null)
            {
                return Results.BadRequest(new { message = "This link is invalid or has expired." });
            }

            // The trust boundary this token exists for: ownership of the
            // inbox is now proven (the atomic claim above succeeded), so the
            // profile snapshot that rode along with the request can now
            // safely be applied — same overwrite-on-every-capture semantics
            // as /leads, just deferred to this point instead of request time
            // (see the doc comment on RequestLinkRequest for why).
            if (!string.IsNullOrWhiteSpace(magicLinkToken.PendingProfileJson))
            {
                var profile = JsonSerializer.Deserialize<ProfileSnapshot>(magicLinkToken.PendingProfileJson);
                if (profile is not null)
                {
                    user.Country = profile.Country;
                    user.Age = profile.Age;
                    user.HighestEducation = profile.HighestEducation;
                    user.OccupationField = profile.OccupationField;
                    user.WorkExperience = profile.WorkExperience;
                    user.DesiredPath = profile.DesiredPath;
                    user.GermanLevel = profile.GermanLevel;
                    user.EnglishLevel = profile.EnglishLevel;
                    user.LanguageCertificate = profile.LanguageCertificate;
                    user.PassportStatus = profile.PassportStatus;
                    user.GermanyConnection = profile.GermanyConnection;
                    user.FinancialSituation = profile.FinancialSituation;
                    user.StartTimeline = profile.StartTimeline;
                    user.RegionFlexibility = profile.RegionFlexibility;
                    user.ProfileUpdatedAt = DateTime.UtcNow;
                }
            }

            var rawSessionToken = TokenGenerator.GenerateRawToken();
            db.Sessions.Add(new Session
            {
                UserId = user.Id,
                TokenHash = TokenGenerator.Hash(rawSessionToken),
                ExpiresAt = DateTime.UtcNow.AddDays(30),
            });

            await db.SaveChangesAsync();

            return Results.Ok(new VerifyResponse(rawSessionToken, user.Email));
        })
        .RequireRateLimiting("auth-verify");

        var authenticated = app.MapGroup("/auth").AddEndpointFilter<SessionAuthFilter>();

        authenticated.MapGet("/me", (HttpContext httpContext) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;
            return Results.Ok(new MeResponse(user.Email));
        });

        authenticated.MapPost("/logout", async (HttpContext httpContext, AppDbContext db) =>
        {
            // Real server-side revocation — deletes the Session row, not
            // just something the client is trusted to forget. A copy of the
            // raw token made before logout would stop working immediately.
            var rawToken = httpContext.Request.Headers["X-Session-Token"].ToString();
            var tokenHash = TokenGenerator.Hash(rawToken);
            var session = await db.Sessions.FirstOrDefaultAsync(s => s.TokenHash == tokenHash);

            if (session is not null)
            {
                db.Sessions.Remove(session);
                await db.SaveChangesAsync();
            }

            return Results.Ok(new { loggedOut = true });
        });
    }

    private static async Task<bool> SendMagicLinkEmailAsync(
        string email,
        string rawToken,
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger logger)
    {
        var apiKey = configuration["Resend:ApiKey"];
        var fromAddress = configuration["Resend:FromAddress"];

        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(fromAddress))
        {
            logger.LogWarning("Resend not configured — magic link email not sent.");
            return false;
        }

        // Built from configured Frontend:BaseUrl, never from the request's
        // Host header — the classic host-header-injection redirect vector
        // OWASP's cheat sheet calls out for password-reset-style links.
        var frontendBaseUrl = configuration["Frontend:BaseUrl"] ?? "http://localhost:3000";
        var verifyUrl = $"{frontendBaseUrl}/auth/verify?token={Uri.EscapeDataString(rawToken)}";

        var payload = new
        {
            from = fromAddress,
            to = new[] { email },
            subject = "Sign in to NOVIRA",
            html = BuildMagicLinkEmailHtml(verifyUrl),
        };

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails")
        {
            Content = JsonContent.Create(payload),
        };
        httpRequest.Headers.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);

        // A hung upstream call would otherwise tie up the request indefinitely.
        httpClient.Timeout = TimeSpan.FromSeconds(10);

        try
        {
            var response = await httpClient.SendAsync(httpRequest);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogWarning(ex, "Failed to send magic link email.");
            return false;
        }
    }

    // Same table-based, inline-styled layout discipline as Program.cs's
    // BuildResultEmailHtml — desktop Outlook renders with Word's engine and
    // ignores flexbox/grid/CSS classes.
    private static string BuildMagicLinkEmailHtml(string verifyUrl)
    {
        var encodedUrl = WebUtility.HtmlEncode(verifyUrl);
        var sb = new StringBuilder();

        sb.Append("<div style=\"background:#f8fafc;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;\">");
        sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:480px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;\">");

        sb.Append("<tr><td style=\"background:#020617;padding:28px 32px;\">");
        sb.Append("<p style=\"margin:0;font-size:13px;font-weight:700;letter-spacing:4px;color:#6ee7b7;\">NOVIRA</p>");
        sb.Append("</td></tr>");

        sb.Append("<tr><td style=\"padding:32px;text-align:center;\">");
        sb.Append("<h1 style=\"margin:0 0 12px;font-size:20px;color:#020617;\">Sign in to NOVIRA</h1>");
        sb.Append("<p style=\"margin:0 0 24px;font-size:14px;line-height:1.6;color:#475569;\">Click the button below to sign in and see your matching opportunities. This link expires in 15 minutes and can only be used once.</p>");
        sb.Append("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin:0 auto;\"><tr>");
        sb.Append($"<td style=\"border-radius:999px;background:#34d399;\"><a href=\"{encodedUrl}\" style=\"display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#020617;text-decoration:none;border-radius:999px;\">Sign in to NOVIRA</a></td>");
        sb.Append("</tr></table>");
        sb.Append("<p style=\"margin:20px 0 0;font-size:12px;color:#94a3b8;\">If you didn&rsquo;t request this, you can safely ignore this email.</p>");
        sb.Append("</td></tr>");

        sb.Append("</table></div>");
        return sb.ToString();
    }
}
