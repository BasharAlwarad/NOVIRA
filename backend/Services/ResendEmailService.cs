using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace Novira.Backend.Services;

// Minimal, reusable Resend sender for document-review emails (per-case
// decision emails + free-text admin messages). Deliberately separate from
// Program.cs's existing inline SendResultEmailAsync/BuildResultEmailHtml
// (the branded result email) rather than a refactor of already-working
// code — same Resend REST call shape, same "flaky/unconfigured provider
// must never mask an already-successful DB write" discipline: returns a
// bool rather than throwing, so callers can record RejectionMessageSent
// without failing the whole request if the email provider is down.
public class ResendEmailService(
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    ILogger<ResendEmailService> logger)
{
    public async Task<bool> SendAsync(string toEmail, string subject, string html)
    {
        var apiKey = configuration["Resend:ApiKey"];
        var fromAddress = configuration["Resend:FromAddress"];

        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(fromAddress))
        {
            return false;
        }

        var payload = new { from = fromAddress, to = new[] { toEmail }, subject, html };

        using var httpClient = httpClientFactory.CreateClient();
        httpClient.Timeout = TimeSpan.FromSeconds(10);

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails")
        {
            Content = JsonContent.Create(payload),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        try
        {
            var response = await httpClient.SendAsync(request);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogWarning(ex, "Failed to send email to {Email}.", toEmail);
            return false;
        }
    }

    // The content-free "you have an update" ping used once messaging moved
    // in-app (2026-08-27) — document decisions and admin free-text messages
    // now write a real Message row (DocumentsAdminEndpoints.cs) instead of
    // emailing their content directly; this is just the notification that
    // one arrived, since there's no other channel to tell a signed-in user
    // that. A failure here never loses the message itself — it's already
    // persisted before this is called.
    public Task<bool> SendMessageNotificationAsync(string toEmail) => SendAsync(
        toEmail,
        "You have a new update on NOVIRA",
        """
        <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <p style="margin:0 0 16px;font-size:13px;font-weight:700;letter-spacing:3px;color:#059669;">NOVIRA</p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">You have a new message from our team — sign in to your NOVIRA account to read it.</p>
        </div>
        """);
}
