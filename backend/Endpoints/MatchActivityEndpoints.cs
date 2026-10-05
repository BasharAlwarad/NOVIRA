using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Models;

namespace Novira.Backend.Endpoints;

public record MatchActivityResponse(Guid OpportunityId, DateTime AppliedAt);

// The "mark as applied" tracker (Architecture.md's "Tier 2 services" — the
// last remaining piece of the original CV-request flow). Deliberately the
// simplest version that survives real use, per the research behind it:
// dedicated job-tracker tools (Teal, Huntr) found that more than a handful
// of pipeline stages gets abandoned, and a bare "Applied" with no next-step
// state is still more honest than NOVIRA could make a richer one — this app
// has no visibility into interview/offer outcomes, which all happen
// directly between the user and the employer. So: one boolean-ish state
// (applied or not) with a timestamp, no stages, no notes field yet.
// Session-authenticated like /matches itself, not tier-gated — self-
// tracking isn't a paid feature, same reasoning as the un-gated intake form.
public static class MatchActivityEndpoints
{
    public static void MapMatchActivityEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/").AddEndpointFilter<SessionAuthFilter>();

        group.MapGet("/match-activity", async (HttpContext httpContext, AppDbContext db) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;

            var activity = await db.MatchActivities
                .Where(a => a.UserId == user.Id)
                .ToListAsync();

            return Results.Ok(activity.Select(a => new MatchActivityResponse(a.OpportunityId, a.AppliedAt)));
        });

        // Create-or-return-existing, not an error on a repeat call — a
        // double-click or a retried request should be a no-op, not a 409.
        group.MapPost("/matches/{opportunityId:guid}/applied", async (
            Guid opportunityId, HttpContext httpContext, AppDbContext db) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;

            var existing = await db.MatchActivities
                .FirstOrDefaultAsync(a => a.UserId == user.Id && a.OpportunityId == opportunityId);
            if (existing is not null)
            {
                return Results.Ok(new MatchActivityResponse(existing.OpportunityId, existing.AppliedAt));
            }

            var opportunityExists = await db.Opportunities.AnyAsync(o => o.Id == opportunityId);
            if (!opportunityExists)
            {
                return Results.NotFound();
            }

            var activity = new MatchActivity { UserId = user.Id, OpportunityId = opportunityId };
            db.MatchActivities.Add(activity);
            await db.SaveChangesAsync();

            return Results.Ok(new MatchActivityResponse(activity.OpportunityId, activity.AppliedAt));
        });

        group.MapDelete("/matches/{opportunityId:guid}/applied", async (
            Guid opportunityId, HttpContext httpContext, AppDbContext db) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;

            var existing = await db.MatchActivities
                .FirstOrDefaultAsync(a => a.UserId == user.Id && a.OpportunityId == opportunityId);
            if (existing is not null)
            {
                db.MatchActivities.Remove(existing);
                await db.SaveChangesAsync();
            }

            return Results.Ok(new { removed = true });
        });
    }
}
