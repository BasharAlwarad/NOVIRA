using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Models;

namespace Novira.Backend.Endpoints;

public record MatchActivityResponse(
    Guid OpportunityId,
    DateTime AppliedAt,
    // Snapshotted display data — see MatchActivity.cs's own comment for why
    // this doesn't depend on /matches still returning the opportunity.
    string OpportunityTitle,
    string OpportunityProvider,
    OpportunityPath OpportunityPath,
    // The one field that's NOT from the snapshot — archiving can happen
    // *after* a user applied, so this needs a live check against the
    // opportunity's current status, not a frozen-at-apply-time value.
    bool IsArchived);

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

            var opportunityIds = activity.Select(a => a.OpportunityId).ToList();
            var archivedIds = (await db.Opportunities
                .Where(o => opportunityIds.Contains(o.Id) && o.Status == OpportunityStatus.Archived)
                .Select(o => o.Id)
                .ToListAsync())
                .ToHashSet();

            return Results.Ok(activity.Select(a => ToResponse(a, archivedIds.Contains(a.OpportunityId))));
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
                var isArchived = await db.Opportunities
                    .AnyAsync(o => o.Id == opportunityId && o.Status == OpportunityStatus.Archived);
                return Results.Ok(ToResponse(existing, isArchived));
            }

            var opportunity = await db.Opportunities.FindAsync(opportunityId);
            if (opportunity is null)
            {
                return Results.NotFound();
            }

            var activity = new MatchActivity
            {
                UserId = user.Id,
                OpportunityId = opportunityId,
                OpportunityTitle = opportunity.Title,
                OpportunityProvider = opportunity.Provider,
                OpportunityPath = opportunity.Path,
            };
            db.MatchActivities.Add(activity);
            await db.SaveChangesAsync();

            return Results.Ok(ToResponse(activity, opportunity.Status == OpportunityStatus.Archived));
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

    private static MatchActivityResponse ToResponse(MatchActivity activity, bool isArchived) =>
        new(activity.OpportunityId, activity.AppliedAt,
            activity.OpportunityTitle, activity.OpportunityProvider, activity.OpportunityPath, isArchived);
}
