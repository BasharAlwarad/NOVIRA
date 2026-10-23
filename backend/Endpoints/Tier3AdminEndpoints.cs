using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Hubs;
using Novira.Backend.Models;
using Novira.Backend.Resources;
using Novira.Backend.Services;

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
    DateTime? AgreementSentAt,
    int? UpfrontAmountEur,
    DateTime? SignedAt,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public record UpdateTier3CaseRequest(Tier3CaseStatus? Status, string? AdminNotes);

// The founder-facing queue for Tier 3 requests — the admin counterpart to
// Tier3Endpoints.cs. Covers status tracking, case notes, and — as of
// 2026-10-23 — sending the signed agreement (step 3 of the build order, see
// Architecture.md's "Tier 3 agreement + payment" section). Payment itself
// stays in PurchasesEndpoints.cs, same pattern Tier1/2 already use.
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

        // Computes the carry-up-adjusted upfront amount, renders and
        // freezes the agreement text onto the case, and messages the user.
        // Deliberately only callable once consultation has happened — the
        // real gate is the founder's own decision to click this, not any
        // status check beyond "a case exists." FounderFullName/BusinessStatus
        // come from config (Tier3Agreement:*, user-secrets), never a
        // hardcoded placeholder — a real signed agreement can't go out
        // naming nobody in particular.
        group.MapPost("/{id:guid}/send-agreement", async (
            Guid id, AppDbContext db, IConfiguration configuration, IHubContext<MessagesHub> hub) =>
        {
            var tier3Case = await db.Tier3Cases.FindAsync(id);
            if (tier3Case is null)
            {
                return Results.NotFound();
            }

            var user = await db.Users.FindAsync(tier3Case.UserId);
            if (user is null)
            {
                return Results.BadRequest(new { message = "This case's user account no longer exists." });
            }

            var founderFullName = configuration["Tier3Agreement:FounderFullName"];
            var businessStatus = configuration["Tier3Agreement:BusinessStatus"];
            if (string.IsNullOrWhiteSpace(founderFullName) || string.IsNullOrWhiteSpace(businessStatus))
            {
                return Results.Problem(
                    "Tier3Agreement:FounderFullName and Tier3Agreement:BusinessStatus must be configured " +
                    "(user-secrets, never committed) before an agreement naming a real party can be sent.",
                    statusCode: StatusCodes.Status500InternalServerError);
            }

            var existingPurchases = await db.Purchases.Where(p => p.UserId == user.Id).ToListAsync();
            var upfrontAmountEur = Tier3PricingCalculator.GetUpfrontAmountEur(existingPurchases);
            var creditAmountEur = TierPricing.GetExpectedAmountEur(PurchaseTier.Tier3) - upfrontAmountEur;
            var creditFromTier = existingPurchases.Any(p => p.Tier == PurchaseTier.Tier2 && p.Status == PurchaseStatus.Paid)
                ? "Tier 2"
                : existingPurchases.Any(p => p.Tier == PurchaseTier.Tier1 && p.Status == PurchaseStatus.Paid)
                    ? "Tier 1"
                    : null;

            var pathText = user.DesiredPath switch
            {
                Models.DesiredPath.University => "a university program",
                Models.DesiredPath.Ausbildung => "an Ausbildung (vocational training) position",
                _ => "an educational or training opportunity",
            };

            var agreementText = Tier3AgreementTemplate.Render(
                founderFullName,
                businessStatus,
                user.FullName ?? user.Email,
                DateTime.UtcNow,
                pathText,
                tier3Case.TargetOpportunityTitle,
                tier3Case.TargetOpportunityProvider,
                upfrontAmountEur,
                creditAmountEur > 0 ? creditAmountEur : null,
                creditFromTier);

            tier3Case.AgreementSentAt = DateTime.UtcNow;
            tier3Case.AgreementText = agreementText;
            tier3Case.UpfrontAmountEur = upfrontAmountEur;
            tier3Case.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            await MessagesEndpoints.CreateAdminMessageAsync(
                db, hub, user.Id,
                "Your Tier 3 agreement is ready",
                $"We've sent over the full-service agreement for your Tier 3 case — the upfront fee is €{upfrontAmountEur}. Review and sign it on your account page whenever you're ready.");

            return Results.Ok(ToResponse(tier3Case, user.Email));
        });
    }

    private static AdminTier3CaseResponse ToResponse(Tier3Case c, string userEmail) => new(
        c.Id, c.UserId, userEmail, c.Status, c.TargetOpportunityId, c.TargetOpportunityTitle,
        c.TargetOpportunityProvider, c.AdminNotes, c.AgreementSentAt, c.UpfrontAmountEur, c.SignedAt,
        c.CreatedAt, c.UpdatedAt);
}
