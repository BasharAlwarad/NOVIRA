using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Models;

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
    }
}
