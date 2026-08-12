using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Models;
using Novira.Backend.Services;

namespace Novira.Backend.Endpoints;

public record OpportunityCountsResponse(int AusbildungCount, int UniversityCount);

/// <summary>
/// The public, count-only counterpart to /admin/match-preview — this is
/// what the result page's real "matching opportunities" numbers call.
/// Deliberately returns counts, never names/details (Plan.md §4's staged
/// reveal — details are gated behind account signup, which doesn't exist
/// yet). No admin key: this runs for anyone who's completed the
/// assessment, not just the founder, so it's rate-limited instead
/// (defense-in-depth alongside the frontend's own per-visitor limiter, same
/// two-layer pattern as /leads — see CLAUDE.md).
/// </summary>
public static class OpportunityCountsEndpoints
{
    public static void MapOpportunityCountsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/opportunity-counts", async (ProfileSnapshot profile, AppDbContext db) =>
        {
            // Never saved — MatchingService only reads profile fields off
            // this object, so a plain in-memory User (not tracked, not
            // persisted) is all this preview needs.
            var previewProfile = new User
            {
                Email = "preview@novira.internal",
                Country = profile.Country,
                Age = profile.Age,
                HighestEducation = profile.HighestEducation,
                OccupationField = profile.OccupationField,
                WorkExperience = profile.WorkExperience,
                DesiredPath = profile.DesiredPath,
                GermanLevel = profile.GermanLevel,
                EnglishLevel = profile.EnglishLevel,
                LanguageCertificate = profile.LanguageCertificate,
                PassportStatus = profile.PassportStatus,
                GermanyConnection = profile.GermanyConnection,
                FinancialSituation = profile.FinancialSituation,
                StartTimeline = profile.StartTimeline,
                RegionFlexibility = profile.RegionFlexibility,
            };

            var approvedOpportunities = await db.Opportunities
                .Where(o => o.Status == OpportunityStatus.Approved)
                .ToListAsync();

            var matches = MatchingService.Match(previewProfile, approvedOpportunities);

            return Results.Ok(new OpportunityCountsResponse(
                AusbildungCount: matches.Count(m => m.Path == OpportunityPath.Ausbildung),
                UniversityCount: matches.Count(m => m.Path == OpportunityPath.University)));
        })
        .RequireRateLimiting("opportunity-counts");
    }
}
