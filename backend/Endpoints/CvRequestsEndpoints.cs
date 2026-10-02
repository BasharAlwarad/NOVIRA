using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Hubs;
using Novira.Backend.Models;
using Novira.Backend.Services;

namespace Novira.Backend.Endpoints;

public record CvRequestResponse(
    Guid Id,
    Guid OpportunityId,
    string OpportunityTitle,
    string OpportunityProvider,
    CvRequestStatus Status,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public record CreateCvRequestRequest(Guid OpportunityId);

// The Tier2+ "request a CV for this match" action (Architecture.md's "Tier 2
// services" build order, step 3) — session-authenticated like /matches, but
// server-side Tier2+-gated (not just hidden in the UI), same discipline the
// Messages reply endpoint and the /matches blur itself already use.
public static class CvRequestsEndpoints
{
    public static void MapCvRequestsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/cv-requests").AddEndpointFilter<SessionAuthFilter>();

        group.MapGet("/", async (HttpContext httpContext, AppDbContext db) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;

            var requests = await db.CvRequests
                .Where(r => r.UserId == user.Id)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Results.Ok(requests.Select(ToResponse));
        });

        group.MapPost("/", async (
            CreateCvRequestRequest request,
            HttpContext httpContext,
            AppDbContext db,
            IHubContext<MessagesHub> hub) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;

            var purchases = await db.Purchases.Where(p => p.UserId == user.Id).ToListAsync();
            var effectiveTier = EffectiveTierCalculator.Compute(purchases);
            if (effectiveTier is not (EffectiveTier.Tier2 or EffectiveTier.Tier3))
            {
                return Results.Json(
                    new { message = "Requesting a CV needs Tier 2 or above." },
                    statusCode: StatusCodes.Status403Forbidden);
            }

            var opportunity = await db.Opportunities.FindAsync(request.OpportunityId);
            if (opportunity is null)
            {
                return Results.NotFound(new { message = "That opportunity no longer exists." });
            }

            // Idempotent: a second click on an already-requested (not yet
            // Delivered) match returns the existing request rather than
            // creating a duplicate — the button is "request", not "spam".
            var existing = await db.CvRequests.FirstOrDefaultAsync(r =>
                r.UserId == user.Id && r.OpportunityId == request.OpportunityId && r.Status != CvRequestStatus.Delivered);
            if (existing is not null)
            {
                return Results.Ok(ToResponse(existing));
            }

            var cvRequest = new CvRequest
            {
                UserId = user.Id,
                OpportunityId = opportunity.Id,
                OpportunityTitle = opportunity.Title,
                OpportunityProvider = opportunity.Provider,
            };
            db.CvRequests.Add(cvRequest);
            await db.SaveChangesAsync();

            // A plain, honest confirmation through the existing in-app
            // Messages channel — reuses the same mechanism the document-
            // review pipeline already proved, no new notification system.
            await MessagesEndpoints.CreateAdminMessageAsync(
                db, hub, user.Id,
                "CV request received",
                $"We've received your request for a CV/cover letter for \"{opportunity.Title}\" at {opportunity.Provider}. We'll review your profile and be in touch.");

            return Results.Created($"/cv-requests/{cvRequest.Id}", ToResponse(cvRequest));
        });
    }

    public static CvRequestResponse ToResponse(CvRequest r) =>
        new(r.Id, r.OpportunityId, r.OpportunityTitle, r.OpportunityProvider, r.Status, r.CreatedAt, r.UpdatedAt);
}
