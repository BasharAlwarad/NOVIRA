using System.Net;
using System.Net.Http.Json;
using System.Net.Mail;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Endpoints;
using Novira.Backend.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddHttpClient();

builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddScoped<AdminAuthFilter>();

// Coarse per-IP ceiling on /leads. Note this only ever sees the Next.js
// server's IP for browser traffic (the frontend proxies the request
// server-side, see frontend/src/app/api/leads/route.ts) — real per-visitor
// throttling happens there, where the actual client IP is still visible.
// This backend limiter exists as defense-in-depth against someone calling
// the API directly and bypassing the frontend entirely.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy("leads", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));
});

var app = builder.Build();

app.UseCors("frontend");
app.UseRateLimiter();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await OpportunitySeeder.SeedIfEmptyAsync(db);
}

app.MapGet("/", () => Results.Ok(new
{
    message = "NOVIRA API is running"
}));

app.MapOpportunitiesAdminEndpoints();

app.MapPost("/leads", async (
    SaveResultRequest request,
    AppDbContext db,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    ILoggerFactory loggerFactory) =>
{
    if (!MailAddress.TryCreate(request.Email, out var parsedEmail))
    {
        return Results.BadRequest(new { message = "Invalid email address." });
    }

    if (!IsWithinSizeLimits(request, out var sizeError))
    {
        return Results.BadRequest(new { message = sizeError });
    }

    // Normalize so "Foo@x.com" and "foo@x.com" hit the same row — the DB
    // unique index is case-sensitive and won't catch this on its own.
    var normalizedEmail = parsedEmail.Address.Trim().ToLowerInvariant();

    var logger = loggerFactory.CreateLogger("Leads");

    try
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (user is null)
        {
            user = new User { Email = normalizedEmail };
            db.Users.Add(user);
        }

        // The DB write is the real conversion event and must succeed
        // regardless of whether the email provider is reachable.
        await db.SaveChangesAsync();

        var emailSent = await SendResultEmailAsync(
            request with { Email = normalizedEmail },
            httpClientFactory.CreateClient(),
            configuration);

        return Results.Ok(new SaveResultResponse(Saved: true, EmailSent: emailSent));
    }
    catch (Exception ex)
    {
        // Never leak exception details (query text, stack traces, connection
        // info) to the caller — log server-side, return a generic message.
        logger.LogError(ex, "Failed to save lead or send result email.");
        return Results.Problem("Something went wrong. Please try again.", statusCode: 500);
    }
})
.RequireRateLimiting("leads");

app.Run();

static async Task<bool> SendResultEmailAsync(
    SaveResultRequest request,
    HttpClient httpClient,
    IConfiguration configuration)
{
    var apiKey = configuration["Resend:ApiKey"];
    var fromAddress = configuration["Resend:FromAddress"];

    if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(fromAddress))
    {
        return false;
    }

    var payload = new
    {
        from = fromAddress,
        to = new[] { request.Email },
        subject = "Your NOVIRA result",
        html = BuildResultEmailHtml(request, configuration),
    };

    using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails")
    {
        Content = JsonContent.Create(payload),
    };
    httpRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);

    // A hung upstream call would otherwise tie up the request indefinitely.
    httpClient.Timeout = TimeSpan.FromSeconds(10);

    try
    {
        var response = await httpClient.SendAsync(httpRequest);
        return response.IsSuccessStatusCode;
    }
    catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
    {
        return false;
    }
}

const int MaxShortFieldLength = 300;
const int MaxLongFieldLength = 2000;
const int MaxListItems = 10;

static bool IsWithinSizeLimits(SaveResultRequest request, out string? error)
{
    if (request.VerdictHeading.Length > MaxShortFieldLength
        || request.VerdictBody.Length > MaxLongFieldLength
        || (request.AdviceFactorLabel?.Length ?? 0) > MaxShortFieldLength
        || (request.AdviceText?.Length ?? 0) > MaxLongFieldLength)
    {
        error = "One or more fields is too long.";
        return false;
    }

    var pathFit = request.PathFit ?? [];
    var documentChecklist = request.DocumentChecklist ?? [];

    if (pathFit.Count > MaxListItems || documentChecklist.Count > MaxListItems)
    {
        error = "Too many items in the request.";
        return false;
    }

    if (pathFit.Any(f => f.PathLabel.Length > MaxShortFieldLength || f.FitLabel.Length > MaxShortFieldLength)
        || documentChecklist.Any(item => item.Length > MaxLongFieldLength))
    {
        error = "One or more fields is too long.";
        return false;
    }

    error = null;
    return true;
}

static string Encode(string value) => WebUtility.HtmlEncode(value);

// Only ever link the branded button to our own frontend — otherwise a
// caller could set ContinueUrl to any external site and get a "View my full
// result on NOVIRA" button pointing at a phishing page.
static bool IsAllowedContinueUrl(string? url, IConfiguration configuration)
{
    var allowedBaseUrl = configuration["Frontend:BaseUrl"] ?? "http://localhost:3000";

    if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)
        || !Uri.TryCreate(allowedBaseUrl, UriKind.Absolute, out var allowedUri))
    {
        return false;
    }

    return (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)
        && Uri.Compare(uri, allowedUri, UriComponents.SchemeAndServer, UriFormat.SafeUnescaped, StringComparison.OrdinalIgnoreCase) == 0;
}

// Table-based layout with inline styles throughout: desktop Outlook renders
// with Word's engine and ignores flexbox/grid/CSS classes, so every visual
// element here has to survive being reduced to <table>/<td> + inline style.
static string BuildResultEmailHtml(SaveResultRequest request, IConfiguration configuration)
{
    var pathFit = request.PathFit ?? [];
    var documentChecklist = request.DocumentChecklist ?? [];
    var sb = new StringBuilder();

    sb.Append("<div style=\"background:#f8fafc;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;\">");
    sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:560px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;\">");

    // Header
    sb.Append("<tr><td style=\"background:#020617;padding:28px 32px;\">");
    sb.Append("<p style=\"margin:0;font-size:13px;font-weight:700;letter-spacing:4px;color:#6ee7b7;\">NOVIRA</p>");
    sb.Append("<p style=\"margin:4px 0 0;font-size:13px;color:#94a3b8;\">Study and work guidance in Germany</p>");
    sb.Append("</td></tr>");

    // Verdict
    sb.Append("<tr><td style=\"padding:32px;\">");
    sb.Append("<p style=\"margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:2px;color:#059669;text-transform:uppercase;\">Your result</p>");
    sb.Append($"<h1 style=\"margin:0 0 12px;font-size:22px;line-height:1.3;color:#020617;\">{Encode(request.VerdictHeading)}</h1>");
    sb.Append($"<p style=\"margin:0;font-size:15px;line-height:1.6;color:#475569;\">{Encode(request.VerdictBody)}</p>");
    sb.Append("</td></tr>");

    // Path fit bars
    if (pathFit.Count > 0)
    {
        sb.Append("<tr><td style=\"padding:0 32px 24px;border-top:1px solid #f1f5f9;padding-top:24px;\">");
        sb.Append("<p style=\"margin:0 0 16px;font-size:14px;font-weight:700;color:#0f172a;\">How you compare across paths</p>");

        foreach (var fit in pathFit)
        {
            var barColor = fit.Highlighted ? "#10b981" : "#cbd5e1";
            var labelColor = fit.Highlighted ? "#047857" : "#64748b";
            var barPercent = Math.Clamp(fit.BarPercent, 0, 100);

            sb.Append("<div style=\"margin-bottom:14px;\">");
            sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>");
            sb.Append($"<td style=\"font-size:13px;font-weight:600;color:#0f172a;\">{Encode(fit.PathLabel)}</td>");
            sb.Append($"<td align=\"right\" style=\"font-size:12px;font-weight:600;color:{labelColor};\">{Encode(fit.FitLabel)}</td>");
            sb.Append("</tr></table>");
            sb.Append("<div style=\"margin-top:6px;height:10px;width:100%;background:#f1f5f9;border-radius:999px;overflow:hidden;\">");
            sb.Append($"<div style=\"height:10px;width:{barPercent}%;background:{barColor};border-radius:999px;\"></div>");
            sb.Append("</div></div>");
        }

        sb.Append("</td></tr>");
    }

    // Improvement advice
    if (!string.IsNullOrWhiteSpace(request.AdviceText))
    {
        sb.Append("<tr><td style=\"padding:0 32px 24px;border-top:1px solid #f1f5f9;padding-top:24px;\">");
        sb.Append("<p style=\"margin:0 0 12px;font-size:14px;font-weight:700;color:#0f172a;\">How to strengthen your profile</p>");
        sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#ecfdf5;border-radius:16px;\"><tr><td style=\"padding:16px;\">");

        if (!string.IsNullOrWhiteSpace(request.AdviceFactorLabel))
        {
            sb.Append($"<p style=\"margin:0 0 4px;font-size:13px;font-weight:700;color:#065f46;\">{Encode(request.AdviceFactorLabel)}</p>");
        }

        sb.Append($"<p style=\"margin:0;font-size:13px;line-height:1.6;color:#047857;\">{Encode(request.AdviceText)}</p>");
        sb.Append("</td></tr></table></td></tr>");
    }

    // Document checklist
    if (documentChecklist.Count > 0)
    {
        sb.Append("<tr><td style=\"padding:0 32px 32px;border-top:1px solid #f1f5f9;padding-top:24px;\">");
        sb.Append("<p style=\"margin:0 0 12px;font-size:14px;font-weight:700;color:#0f172a;\">Documents you&rsquo;ll likely need</p>");

        foreach (var item in documentChecklist)
        {
            sb.Append("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:8px;\"><tr>");
            sb.Append("<td valign=\"top\" style=\"padding-right:10px;padding-top:6px;\"><div style=\"width:6px;height:6px;border-radius:999px;background:#cbd5e1;\"></div></td>");
            sb.Append($"<td style=\"font-size:13px;line-height:1.6;color:#475569;\">{Encode(item)}</td>");
            sb.Append("</tr></table>");
        }

        sb.Append("<p style=\"margin:12px 0 0;font-size:11px;line-height:1.5;color:#94a3b8;\">General information based on typical requirements, not personalized legal or immigration advice. A licensed advisor can confirm exactly what applies to your situation.</p>");
        sb.Append("</td></tr>");
    }

    // CTA — a "bulletproof" table+anchor button (not an image) so it renders
    // and stays clickable even with images blocked, and survives Outlook's
    // Word rendering engine, which ignores CSS on plain <a> tags.
    if (IsAllowedContinueUrl(request.ContinueUrl, configuration))
    {
        sb.Append("<tr><td style=\"padding:0 32px 32px;border-top:1px solid #f1f5f9;padding-top:24px;text-align:center;\">");
        sb.Append("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin:0 auto;\"><tr>");
        sb.Append($"<td style=\"border-radius:999px;background:#34d399;\"><a href=\"{Encode(request.ContinueUrl!)}\" style=\"display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#020617;text-decoration:none;border-radius:999px;\">View my full result on NOVIRA</a></td>");
        sb.Append("</tr></table>");
        sb.Append("</td></tr>");
    }

    sb.Append("</table>");

    // Footer
    sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:560px;margin:16px auto 0;\"><tr><td style=\"padding:0 32px;text-align:center;\">");
    sb.Append("<p style=\"margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;color:#059669;\">NOVIRA</p>");
    sb.Append("<p style=\"margin:0;font-size:11px;line-height:1.6;color:#94a3b8;\">NOVIRA helps people in Germany find study and work opportunities with the support of specialists, experts, and AI-assisted guidance.</p>");
    sb.Append("<p style=\"margin:8px 0 0;font-size:11px;color:#cbd5e1;\">You&rsquo;re receiving this because you requested your NOVIRA assessment result.</p>");
    sb.Append("</td></tr></table>");

    sb.Append("</div>");
    return sb.ToString();
}

record PathFitEntry(string PathLabel, string FitLabel, int BarPercent, bool Highlighted);

record SaveResultRequest(
    string Email,
    string VerdictHeading,
    string VerdictBody,
    string? AdviceFactorLabel,
    string? AdviceText,
    List<PathFitEntry> PathFit,
    List<string> DocumentChecklist,
    string? ContinueUrl);

record SaveResultResponse(bool Saved, bool EmailSent);
