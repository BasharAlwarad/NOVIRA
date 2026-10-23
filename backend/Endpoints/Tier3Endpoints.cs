using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Hubs;
using Novira.Backend.Models;

namespace Novira.Backend.Endpoints;

public record Tier3CaseResponse(
    Guid Id,
    Tier3CaseStatus Status,
    string? TargetOpportunityTitle,
    string? TargetOpportunityProvider,
    DateTime? AgreementSentAt,
    string? AgreementText,
    int? UpfrontAmountEur,
    DateTime? SignedAt,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public record SignAgreementRequest(string FullName);

// The user-facing side of Tier 3 ("full service, including applying on the
// user's behalf" — Monetization-Strategy.md §4.1 item 4). Deliberately not
// self-checkout: POST /tier3/request only ever creates a case in Requested
// status and sends a real in-app confirmation message — there is no payment
// here. The actual agreement, signature, and upfront payment happen later,
// after the real conversation Monetization-Strategy.md §4.1 requires before
// any money or signature changes hands — see Architecture.md for this
// build's own step sequencing.
public static class Tier3Endpoints
{
    public static void MapTier3Endpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/tier3").AddEndpointFilter<SessionAuthFilter>();

        group.MapGet("/my-case", async (HttpContext httpContext, AppDbContext db) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;

            var tier3Case = await db.Tier3Cases.FirstOrDefaultAsync(c => c.UserId == user.Id);
            return Results.Ok(tier3Case is null ? null : ToResponse(tier3Case));
        });

        // Create-or-return-existing, same "a double-click or a retried
        // request should be a no-op, not an error" discipline as
        // MatchActivityEndpoints' own applied-marker endpoint — the unique
        // index on UserId is what actually enforces "one case per user" at
        // the database level; this just makes a second call idempotent
        // instead of erroring on the constraint.
        group.MapPost("/request", async (
            HttpContext httpContext, AppDbContext db, IHubContext<MessagesHub> hub) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;

            var existing = await db.Tier3Cases.FirstOrDefaultAsync(c => c.UserId == user.Id);
            if (existing is not null)
            {
                return Results.Ok(ToResponse(existing));
            }

            var tier3Case = new Tier3Case { UserId = user.Id };
            db.Tier3Cases.Add(tier3Case);
            await db.SaveChangesAsync();

            // A plain, honest confirmation through the existing in-app
            // Messages channel — same mechanism CvRequestsEndpoints already
            // uses for its own "request received" notice, not a new
            // notification system. No live SignalR push to the admin side —
            // same precedent CV requests already set (the founder discovers
            // a new request by visiting the admin page, not a push).
            await MessagesEndpoints.CreateAdminMessageAsync(
                db, hub, user.Id,
                "We've received your Tier 3 request",
                "Thanks for your interest in full-service help. We'll reach out here to schedule a real conversation before anything else happens — no payment or commitment yet.");

            return Results.Ok(ToResponse(tier3Case));
        });

        // Records the signature immediately — captured even if the user
        // never completes the payment that follows, since consent to the
        // agreement and payment are two separate, sequential actions (see
        // Architecture.md's "Tier 3 agreement + payment" section for why).
        // SignerIp comes from the connection, never trusted from the
        // request body. Does not change Tier3CaseStatus — that only moves
        // to AgreementSigned once payment is also verified
        // (PurchasesEndpoints.cs), so a signed-but-unpaid case doesn't look
        // further along than it actually is.
        group.MapPost("/sign-agreement", async (
            SignAgreementRequest request, HttpContext httpContext, AppDbContext db) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;

            if (string.IsNullOrWhiteSpace(request.FullName))
            {
                return Results.BadRequest(new { message = "Please type your full legal name." });
            }

            var tier3Case = await db.Tier3Cases.FirstOrDefaultAsync(c => c.UserId == user.Id);
            if (tier3Case is null || tier3Case.AgreementSentAt is null)
            {
                return Results.BadRequest(new { message = "There's no agreement waiting for your signature." });
            }

            if (tier3Case.SignedAt is not null)
            {
                return Results.Ok(ToResponse(tier3Case));
            }

            tier3Case.SignedAt = DateTime.UtcNow;
            tier3Case.SignedFullName = request.FullName.Trim();
            tier3Case.SignerIp = httpContext.Connection.RemoteIpAddress?.ToString();
            tier3Case.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            return Results.Ok(ToResponse(tier3Case));
        });
    }

    private static Tier3CaseResponse ToResponse(Tier3Case c) => new(
        c.Id, c.Status, c.TargetOpportunityTitle, c.TargetOpportunityProvider,
        c.AgreementSentAt, c.AgreementText, c.UpfrontAmountEur, c.SignedAt, c.CreatedAt, c.UpdatedAt);
}
