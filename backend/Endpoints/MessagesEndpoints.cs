using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Models;

namespace Novira.Backend.Endpoints;

public record MessageResponse(Guid Id, string Subject, string Body, DateTime CreatedAt, DateTime? ReadAt);

// A signed-in user's own view of the in-app messages sent to them by an
// admin (DocumentsAdminEndpoints.cs's Deny/FlagRed decisions and free-text
// message both write here now instead of sending full-content email — see
// that file's comments). Session-authenticated like /documents/ /matches,
// not admin-key protected.
public static class MessagesEndpoints
{
    public static void MapMessagesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/messages").AddEndpointFilter<SessionAuthFilter>();

        group.MapGet("/", async (HttpContext httpContext, AppDbContext db) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;

            var messages = await db.Messages
                .Where(m => m.UserId == user.Id)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

            return Results.Ok(messages.Select(m => new MessageResponse(m.Id, m.Subject, m.Body, m.CreatedAt, m.ReadAt)));
        });

        // Page-level read tracking, not per-message — viewing the account
        // page's Messages section counts as "read" for everything currently
        // unread. Atomic conditional UPDATE (same pattern AuthEndpoints.cs
        // uses for magic-link consumption), not a read-then-write loop.
        group.MapPost("/read-all", async (HttpContext httpContext, AppDbContext db) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;
            var now = DateTime.UtcNow;

            await db.Messages
                .Where(m => m.UserId == user.Id && m.ReadAt == null)
                .ExecuteUpdateAsync(setters => setters.SetProperty(m => m.ReadAt, now));

            return Results.Ok(new { markedRead = true });
        });
    }
}
