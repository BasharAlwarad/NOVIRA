using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Models;
using Novira.Backend.Services;

namespace Novira.Backend.Endpoints;

// One row per user whose most recent message is from them, not the team —
// "the ball is in our court." Deliberately not a persisted admin-read flag
// (no AdminReadAt column on Message): the model has no concept of "has the
// admin seen this," and the simplest, no-migration-needed signal that
// actually matches what "needs a reply" means is just "who spoke last." A
// thread that's since been answered correctly drops off this list even if
// the admin never explicitly "marked it read" — same logic a real support
// inbox's open/answered status already follows.
public record InboxEntry(
    Guid UserId,
    string Email,
    string? FullName,
    string? VerifiedFullName,
    string EffectiveTier,
    Guid LatestMessageId,
    string LatestMessageBody,
    DateTime LatestMessageCreatedAt);

// Built 2026-11-07 — closes a real workflow gap: answering a message meant
// Users → find the row → open the full profile → click the Messages tab →
// scroll past Overview/Documents/CV tabs, for what's often a one-line
// reply. This is the fast path: a flat, reply-focused list instead of the
// full customer record.
public static class InboxAdminEndpoints
{
    public static void MapInboxAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/admin/inbox").AddEndpointFilter<AdminAuthFilter>();

        group.MapGet("/", async (AppDbContext db) =>
        {
            // Small scale today (a handful of users, a handful of messages
            // each) — one ordered fetch plus in-memory grouping is simpler
            // and more reliably correct than coaxing EF into translating a
            // "latest row per group" window function, and isn't worth
            // optimizing until the data actually grows past this.
            var allMessages = await db.Messages
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

            var latestPerUser = allMessages
                .GroupBy(m => m.UserId)
                .Select(g => g.First())
                .Where(m => m.Sender == MessageSender.User)
                .OrderByDescending(m => m.CreatedAt)
                .ToList();

            var userIds = latestPerUser.Select(m => m.UserId).ToList();
            var usersById = await db.Users
                .Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id);

            var purchasesByUser = (await db.Purchases
                .Where(p => userIds.Contains(p.UserId))
                .ToListAsync())
                .GroupBy(p => p.UserId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var items = latestPerUser
                // Guards against an orphaned message from a deleted account
                // — shouldn't happen (Messages cascade-deletes with User),
                // but cheap to skip rather than throw on a dictionary miss.
                .Where(m => usersById.ContainsKey(m.UserId))
                .Select(m =>
                {
                    var user = usersById[m.UserId];
                    return new InboxEntry(
                        user.Id, user.Email, user.FullName, user.VerifiedFullName,
                        EffectiveTierCalculator.Compute(purchasesByUser.GetValueOrDefault(user.Id, [])).ToString(),
                        m.Id, m.Body, m.CreatedAt);
                })
                .ToList();

            return Results.Ok(items);
        });
    }
}
