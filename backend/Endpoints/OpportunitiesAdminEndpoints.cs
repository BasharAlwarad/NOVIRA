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
    DateTime? ReviewedAt);

public record UpdateOpportunityStatusRequest(OpportunityStatus Status);

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
        o.TuitionFeeEur, o.StartDate, o.ApplicationDeadline, o.Status, o.CreatedAt, o.ReviewedAt);

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

            opportunity.Status = request.Status;
            opportunity.ReviewedAt = DateTime.UtcNow;
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
    }
}
