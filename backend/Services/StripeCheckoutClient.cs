using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Serialization;

namespace Novira.Backend.Services;

public record StripeCheckoutSession(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("payment_status")] string? PaymentStatus,
    [property: JsonPropertyName("amount_total")] long? AmountTotal,
    [property: JsonPropertyName("currency")] string? Currency);

// Minimal, read-only Stripe REST wrapper — just enough to retrieve a
// Checkout Session and check what was actually paid, mirroring
// ResendEmailService's "thin wrapper over the provider's REST API, no SDK"
// pattern rather than pulling in the full Stripe.net package for one GET
// call. Auth follows Stripe's own documented curl pattern for this API
// (`curl https://api.stripe.com/... -u sk_...:`) — HTTP Basic with the
// secret key as username and no password.
public class StripeCheckoutClient(
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    ILogger<StripeCheckoutClient> logger)
{
    public async Task<StripeCheckoutSession?> GetSessionAsync(string sessionId)
    {
        var secretKey = configuration["Stripe:SecretKey"];
        if (string.IsNullOrWhiteSpace(secretKey))
        {
            logger.LogError("Stripe:SecretKey is not configured — cannot verify checkout sessions.");
            return null;
        }

        using var httpClient = httpClientFactory.CreateClient();
        httpClient.Timeout = TimeSpan.FromSeconds(10);
        httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Basic", Convert.ToBase64String(Encoding.ASCII.GetBytes($"{secretKey}:")));

        try
        {
            var response = await httpClient.GetAsync(
                $"https://api.stripe.com/v1/checkout/sessions/{Uri.EscapeDataString(sessionId)}");

            if (!response.IsSuccessStatusCode)
            {
                // Covers both "not configured right" and "bad/expired session
                // id from a tampered or stale redirect URL" — either way,
                // the caller should treat this as "could not verify," not a
                // hard 500.
                logger.LogWarning("Stripe checkout session lookup failed: {StatusCode}", response.StatusCode);
                return null;
            }

            return await response.Content.ReadFromJsonAsync<StripeCheckoutSession>();
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogError(ex, "Stripe checkout session lookup threw.");
            return null;
        }
    }
}
