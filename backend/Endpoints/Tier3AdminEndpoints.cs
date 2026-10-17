using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Models;

namespace Novira.Backend.Endpoints;

public record AdminTier3CaseResponse(
    Guid Id,
    Guid UserId,
    string UserEmail,
    Tier3CaseStatus Status,
    Guid? TargetOpportunityId,
    string? TargetOpportunityTitle,
    string? TargetOpportunityProvider,
    string? AdminNotes,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public record UpdateTier3CaseRequest(Tier3CaseStatus? Status, string? AdminNotes);

// The founder-facing queue for Tier 3 requests — the admin counterpart to
// Tier3Endpoints.cs. Covers status tracking and case notes only for this
// first pass; setting a target opportunity, the signed agreement, and
// payment are later steps (see Architecture.md's Tier 3 build order).
public static class Tier3AdminEndpoints
{
    public static void MapTier3AdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/admin/tier3-cases").AddEndpointFilter<AdminAuthFilter>();

        group.MapGet("/", async (AppDbContext db) =>
        {
            var cases = await db.Tier3Cases.OrderByDescending(c => c.CreatedAt).ToListAsync();
            var userIds = cases.Select(c => c.UserId).Distinct().ToList();
            var emails = await db.Users
                .Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.Email);

            return Results.Ok(cases.Select(c => ToResponse(c, emails.GetValueOrDefault(c.UserId, "(deleted user)"))));
        });

        // Status and AdminNotes update together, same "whatever the admin
        // sends, apply it" shape as OpportunitiesAdminEndpoints' archive
        // reason — both fields optional so a note-only edit doesn't require
        // resending the current status back.
        group.MapPatch("/{id:guid}", async (Guid id, UpdateTier3CaseRequest request, AppDbContext db) =>
        {
            var tier3Case = await db.Tier3Cases.FindAsync(id);
            if (tier3Case is null)
            {
                return Results.NotFound();
            }

            if (request.Status is { } status)
            {
                tier3Case.Status = status;
            }
            if (request.AdminNotes is not null)
            {
                tier3Case.AdminNotes = request.AdminNotes;
            }
            tier3Case.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            var user = await db.Users.FindAsync(tier3Case.UserId);
            return Results.Ok(ToResponse(tier3Case, user?.Email ?? "(deleted user)"));
        });
    }

    private static AdminTier3CaseResponse ToResponse(Tier3Case c, string userEmail) => new(
        c.Id, c.UserId, userEmail, c.Status, c.TargetOpportunityId, c.TargetOpportunityTitle,
        c.TargetOpportunityProvider, c.AdminNotes, c.CreatedAt, c.UpdatedAt);
}
