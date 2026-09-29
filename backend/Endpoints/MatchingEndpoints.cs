using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Models;
using Novira.Backend.Services;

namespace Novira.Backend.Endpoints;

public record MatchPreviewRequest(string Email);

// The blur-then-unlock shape (Monetization-Strategy.md §4.1) — a Free-tier
// user gets exactly one real match (the highest-scoring, since MatchingService
// already returns results sorted) plus a bare count of the rest. Deliberately
// never sends any real data (title/provider/path/factors) for the blurred
// remainder — a signed-in user calling this endpoint directly (Postman, curl)
// must not be able to recover real match details this way, same discipline
// OpportunityCountsEndpoints.cs already follows for the anonymous count.
public record MatchesResponse(string EffectiveTier, List<MatchResult> Matches, int BlurredCount, List<StateCount> StateBreakdown);

// A per-state count of the user's FULL match list (before any blur
// truncation) — safe to send in full even to a Free-tier user, since it's
// an aggregate count with no per-listing detail, same "counts only" rule
// OpportunityCountsEndpoints.cs already follows. Agreed 2026-09-29: a
// ranked "state: count" list rather than a literal SVG map, after research
// found no strong precedent for a shaded-map-as-unlock-teaser even among
// same-market competitors.
public record StateCount(string State, int Count);

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

            var purchases = await db.Purchases.Where(p => p.UserId == user.Id).ToListAsync();
            var effectiveTier = EffectiveTierCalculator.Compute(purchases);

            // Computed from the FULL match list, before any blur truncation
            // — an aggregate count per state is safe to send in full even to
            // a Free-tier user (see StateCount's own comment).
            var stateBreakdown = matches
                .Select(m => GermanStateMapper.ResolveState(m.Location))
                .Where(state => state is not null)
                .GroupBy(state => state!)
                .Select(g => new StateCount(g.Key, g.Count()))
                .OrderByDescending(s => s.Count)
                .ToList();

            if (effectiveTier == EffectiveTier.Free)
            {
                var visible = matches.Take(1).ToList();
                var blurredCount = matches.Count - visible.Count;
                return Results.Ok(new MatchesResponse(effectiveTier.ToString(), visible, blurredCount, stateBreakdown));
            }

            return Results.Ok(new MatchesResponse(effectiveTier.ToString(), matches, 0, stateBreakdown));
        });
    }
}
