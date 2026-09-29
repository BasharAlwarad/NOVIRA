using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Models;
using Novira.Backend.Services;

namespace Novira.Backend.Endpoints;

public record VerifySessionRequest(string Tier, string SessionId);

public record VerifySessionResponse(string EffectiveTier, bool AlreadyProcessed);

// Verifies a completed Stripe Checkout Session server-side and, if it
// checks out, records a Purchase — the MVP alternative to a full webhook
// receiver (see Architecture.md's payment section). The frontend lands
// back on /account with ?checkout_session={id} after Stripe's Payment Link
// redirect and calls this once. Known limitation carried over from that
// design: a user who pays but never returns to the redirect URL never gets
// unlocked this way — a real webhook is the eventual fix, not built yet.
public static class PurchasesEndpoints
{
    public static void MapPurchasesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/purchases").AddEndpointFilter<SessionAuthFilter>();

        group.MapPost("/verify-session", async (
            VerifySessionRequest request,
            HttpContext httpContext,
            AppDbContext db,
            StripeCheckoutClient stripeClient) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;

            if (!Enum.TryParse<PurchaseTier>(request.Tier, ignoreCase: true, out var tier))
            {
                return Results.BadRequest(new { message = "Unknown tier." });
            }

            if (string.IsNullOrWhiteSpace(request.SessionId))
            {
                return Results.BadRequest(new { message = "Missing session id." });
            }

            // Idempotent: a page refresh on /account?checkout_session=...
            // would otherwise hit the unique index and fail on the second
            // call for the same, already-processed session.
            var existing = await db.Purchases.FirstOrDefaultAsync(p => p.StripeSessionId == request.SessionId);
            if (existing is not null)
            {
                if (existing.UserId != user.Id)
                {
                    // Someone else's session id being replayed against this
                    // account — never grant access on the strength of that.
                    return Results.BadRequest(new { message = "This checkout session does not belong to your account." });
                }

                return Results.Ok(await BuildResponseAsync(db, user.Id, alreadyProcessed: true));
            }

            var session = await stripeClient.GetSessionAsync(request.SessionId);
            if (session is null)
            {
                return Results.BadRequest(new { message = "Could not verify this checkout session with Stripe." });
            }

            if (session.PaymentStatus != "paid")
            {
                return Results.BadRequest(new { message = "This checkout session has not been paid." });
            }

            var expectedAmountEur = TierPricing.GetExpectedAmountEur(tier);
            var expectedAmountCents = expectedAmountEur * 100L;

            if (session.Currency?.ToLowerInvariant() != "eur" || session.AmountTotal != expectedAmountCents)
            {
                return Results.BadRequest(new { message = "The paid amount does not match the expected price for this tier." });
            }

            db.Purchases.Add(new Purchase
            {
                UserId = user.Id,
                Tier = tier,
                AmountEur = expectedAmountEur,
                StripeSessionId = request.SessionId,
            });

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // Lost a race against a concurrent call verifying the same
                // session id (the unique index rejected the insert) — same
                // outcome as the idempotent path above.
                return Results.Ok(await BuildResponseAsync(db, user.Id, alreadyProcessed: true));
            }

            return Results.Ok(await BuildResponseAsync(db, user.Id, alreadyProcessed: false));
        });
    }

    private static async Task<VerifySessionResponse> BuildResponseAsync(AppDbContext db, Guid userId, bool alreadyProcessed)
    {
        var purchases = await db.Purchases.Where(p => p.UserId == userId).ToListAsync();
        return new VerifySessionResponse(EffectiveTierCalculator.Compute(purchases).ToString(), alreadyProcessed);
    }
}
