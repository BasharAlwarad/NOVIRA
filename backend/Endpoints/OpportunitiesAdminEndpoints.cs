using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Models;
using Novira.Backend.Services;

namespace Novira.Backend.Endpoints;

public record OpportunityResponse(
    Guid Id,
    string Title,
    string Provider,
    OpportunityPath Path,
    string? Location,
    string? Description,
    string? SourceUrl,
    OpportunitySource Source,
    string? SourceRef,
    string? OccupationField,
    LanguageLevel? RequiredGermanLevel,
    LanguageLevel? RequiredEnglishLevel,
    bool RequiresCertifiedLanguageProof,
    EducationLevel? MinEducationLevel,
    int? MonthlyCompensationEur,
    int? TuitionFeeEur,
    DateOnly? StartDate,
    DateOnly? ApplicationDeadline,
    OpportunityStatus Status,
    DateTime CreatedAt,
    DateTime? ReviewedAt,
    DateTime? ArchivedAt,
    string? ArchiveReason,
    int StaleCheckMissCount);

public record UpdateOpportunityStatusRequest(OpportunityStatus Status);
public record ArchiveOpportunityRequest(string? Reason);

// The manual-curation counterpart to OpportunitySyncService — for sources
// with no API to sync from (currently: all University data). Deliberately
// generic over OpportunityPath, not University-only, so the same mechanism
// covers hand-curated Ausbildung entries too if that's ever needed. Source
// is always Manual and Status always Pending server-side, never
// client-supplied — this must go through the same review gate as
// everything else, never land pre-approved.
public record CreateOpportunityRequest(
    string Title,
    string Provider,
    OpportunityPath Path,
    string? Location,
    string? Description,
    string? SourceUrl,
    string? OccupationField,
    LanguageLevel? RequiredGermanLevel,
    LanguageLevel? RequiredEnglishLevel,
    bool RequiresCertifiedLanguageProof,
    EducationLevel? MinEducationLevel,
    int? MonthlyCompensationEur,
    int? TuitionFeeEur,
    DateOnly? StartDate,
    DateOnly? ApplicationDeadline);

public static class OpportunitiesAdminEndpoints
{
    private static OpportunityResponse ToResponse(Opportunity o) => new(
        o.Id, o.Title, o.Provider, o.Path, o.Location, o.Description, o.SourceUrl,
        o.Source, o.SourceRef, o.OccupationField, o.RequiredGermanLevel, o.RequiredEnglishLevel,
        o.RequiresCertifiedLanguageProof, o.MinEducationLevel, o.MonthlyCompensationEur,
        o.TuitionFeeEur, o.StartDate, o.ApplicationDeadline, o.Status, o.CreatedAt, o.ReviewedAt,
        o.ArchivedAt, o.ArchiveReason, o.StaleCheckMissCount);

    public static void MapOpportunitiesAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/admin/opportunities").AddEndpointFilter<AdminAuthFilter>();

        group.MapGet("/", async (AppDbContext db) =>
        {
            var opportunities = await db.Opportunities
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            return Results.Ok(opportunities.Select(ToResponse));
        });

        group.MapPost("/", async (CreateOpportunityRequest request, AppDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Provider))
            {
                return Results.BadRequest(new { message = "Title and provider are required." });
            }

            var opportunity = new Opportunity
            {
                Title = request.Title.Trim(),
                Provider = request.Provider.Trim(),
                Path = request.Path,
                Location = request.Location,
                Description = request.Description,
                SourceUrl = request.SourceUrl,
                Source = OpportunitySource.Manual,
                OccupationField = request.OccupationField,
                RequiredGermanLevel = request.RequiredGermanLevel,
                RequiredEnglishLevel = request.RequiredEnglishLevel,
                RequiresCertifiedLanguageProof = request.RequiresCertifiedLanguageProof,
                MinEducationLevel = request.MinEducationLevel,
                MonthlyCompensationEur = request.MonthlyCompensationEur,
                TuitionFeeEur = request.TuitionFeeEur,
                StartDate = request.StartDate,
                ApplicationDeadline = request.ApplicationDeadline,
                Status = OpportunityStatus.Pending,
            };

            db.Opportunities.Add(opportunity);
            await db.SaveChangesAsync();

            return Results.Created($"/admin/opportunities/{opportunity.Id}", ToResponse(opportunity));
        });

        group.MapPatch("/{id:guid}", async (Guid id, UpdateOpportunityStatusRequest request, AppDbContext db) =>
        {
            if (request.Status is not (OpportunityStatus.Approved or OpportunityStatus.Denied))
            {
                return Results.BadRequest(new { message = "Status must be Approved or Denied." });
            }

            var opportunity = await db.Opportunities.FindAsync(id);
            if (opportunity is null)
            {
                return Results.NotFound();
            }

            // Reverting out of Archived (e.g. an admin correcting a mistaken
            // archive) needs its archive metadata cleared too — otherwise a
            // now-Approved opportunity would still show a stale "Archived
            // at .../reason ..." in the admin UI, even though it's live again.
            if (opportunity.Status == OpportunityStatus.Archived)
            {
                opportunity.ArchivedAt = null;
                opportunity.ArchiveReason = null;
                opportunity.StaleCheckMissCount = 0;
            }

            opportunity.Status = request.Status;
            opportunity.ReviewedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            return Results.Ok(ToResponse(opportunity));
        });

        // Retires a listing without deleting it — see OpportunityStatus.
        // Archived's own comment for why deletion was never the right move
        // (MatchActivity/CvRequest have Restrict-on-delete FKs specifically
        // so a user's history survives this). Only reachable from Approved —
        // archiving something Pending/Denied isn't a meaningful action,
        // since neither was ever live for matching in the first place.
        group.MapPost("/{id:guid}/archive", async (Guid id, ArchiveOpportunityRequest request, AppDbContext db) =>
        {
            var opportunity = await db.Opportunities.FindAsync(id);
            if (opportunity is null)
            {
                return Results.NotFound();
            }

            if (opportunity.Status != OpportunityStatus.Approved)
            {
                return Results.BadRequest(new { message = "Only an Approved opportunity can be archived." });
            }

            opportunity.Status = OpportunityStatus.Archived;
            opportunity.ArchivedAt = DateTime.UtcNow;
            opportunity.ArchiveReason = string.IsNullOrWhiteSpace(request.Reason)
                ? "Manually archived by admin"
                : request.Reason.Trim();
            await db.SaveChangesAsync();

            return Results.Ok(ToResponse(opportunity));
        });

        // Manually triggered — not a background job (see the class comment
        // on OpportunitySyncService). Synced rows land as Pending, same
        // review as the fake seed data; nothing here is auto-published.
        group.MapPost("/sync-ausbildung", async (OpportunitySyncService syncService) =>
        {
            var added = await syncService.SyncAusbildungAsync();
            return Results.Ok(new { added });
        });

        // Flags *candidates* for archiving, never archives automatically —
        // see OpportunitySyncService.CheckStaleAusbildungAsync's own comment
        // for why a single miss (or even the bulk re-search itself) isn't a
        // reliable enough signal to act on without a human confirming.
        group.MapPost("/check-stale-ausbildung", async (OpportunitySyncService syncService) =>
        {
            var result = await syncService.CheckStaleAusbildungAsync();
            return Results.Ok(new { checkedCount = result.Checked, candidates = result.Candidates });
        });

        // AI-assisted University sourcing (built 2026-08-29) — the
        // counterpart to sync-ausbildung above, for a path with no API to
        // sync from. Same discipline: manually triggered, not a background
        // job, and everything lands Pending — see OpportunitySyncService.
        // GenerateUniversityAsync / UniversityResearchService for the
        // source-credibility design.
        group.MapPost("/generate-university", async (OpportunitySyncService syncService) =>
        {
            var result = await syncService.GenerateUniversityAsync();
            return Results.Ok(new
            {
                added = result.Added,
                fieldsResearched = result.FieldsResearched,
                fieldsSkipped = result.FieldsSkipped,
                estimatedCostUsd = result.EstimatedCostUsd,
            });
        });
    }
}
