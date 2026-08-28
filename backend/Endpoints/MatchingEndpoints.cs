using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Models;
using Novira.Backend.Services;

namespace Novira.Backend.Endpoints;

public record MatchPreviewRequest(string Email);

public static class MatchingEndpoints
{
    public static void MapMatchingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/admin").AddEndpointFilter<AdminAuthFilter>();

        // Internal preview/test harness for the matcher — not the real
        // user-facing "opportunity count" feature yet (see CLAUDE.md Phase 2).
        // Looks up an already-captured Users row (see profile-snapshot.ts)
        // rather than taking a profile inline, so this exercises the real
        // data pipeline end to end.
        group.MapPost("/match-preview", async (MatchPreviewRequest request, AppDbContext db) =>
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);

            if (user is null)
            {
                return Results.NotFound(new { message = "No captured profile found for that email." });
            }

            var approvedOpportunities = await db.Opportunities
                .Where(o => o.Status == OpportunityStatus.Approved)
                .ToListAsync();

            var matches = MatchingService.Match(user, approvedOpportunities);

            return Results.Ok(matches);
        });

        // The real signup payoff (Plan.md §4's "see real matches, still
        // free" boundary) — full match details (not just counts, unlike
        // /opportunity-counts) for the logged-in user's own profile only.
        // Session-authenticated, not admin-key-protected: this is for any
        // signed-up user, not just the founder.
        var authenticated = app.MapGroup("/").AddEndpointFilter<SessionAuthFilter>();

        authenticated.MapGet("/matches", async (HttpContext httpContext, AppDbContext db) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;

            var approvedOpportunities = await db.Opportunities
                .Where(o => o.Status == OpportunityStatus.Approved)
                .ToListAsync();

            var matches = MatchingService.Match(user, approvedOpportunities);

            return Results.Ok(matches);
        });
    }
}
