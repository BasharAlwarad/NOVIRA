using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Hubs;
using Novira.Backend.Models;
using Novira.Backend.Services;

namespace Novira.Backend.Endpoints;

public record MessageResponse(
    Guid Id, string Subject, string Body, DateTime CreatedAt, DateTime? ReadAt, string Sender,
    bool HasAttachment, string? AttachmentFileName);

public record SendUserMessageRequest(string Body);

// A signed-in user's own view of the in-app messages exchanged with an
// admin. Originally one-way (admin -> user, via DocumentsAdminEndpoints.cs's
// Deny/FlagRed decisions and free-text message); two-way replies (this
// file's POST /) were added 2026-09-30, gated to Tier2+ — see Message.cs's
// comment for why. Session-authenticated like /documents/ /matches, not
// admin-key protected.
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

            return Results.Ok(messages.Select(ToResponse));
        });

        // Short-lived SAS URI for a message's attachment, fetched on demand
        // — same "never persist a permanent link, generate on read" pattern
        // as the document-preview URLs. Ownership-checked: a user can only
        // ever fetch their own message's attachment.
        group.MapGet("/{id:guid}/attachment", async (Guid id, HttpContext httpContext, AppDbContext db, AzureBlobStorageService storage) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;
            var message = await db.Messages.FirstOrDefaultAsync(m => m.Id == id && m.UserId == user.Id);

            if (message?.AttachmentBlobName is null)
            {
                return Results.NotFound();
            }

            // .AbsoluteUri, not .ToString() — the latter returns a "human
            // readable" unescaped form (found live 2026-10-02: a real
            // opportunity title with spaces/slashes produced a URL curl
            // couldn't even connect to). downloadFileName forces a real
            // download with the correct name instead of an inline view.
            var url = storage.GenerateReadSasUri(message.AttachmentBlobName, downloadFileName: message.AttachmentFileName);
            return Results.Ok(new { url = url.AbsoluteUri });
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

        // The Tier2+ reply path — enforced server-side (not just hidden in
        // the UI), same discipline as every other tier gate in this app
        // (the /matches blur, the verify-session amount check). No
        // threading/subject for a reply yet — a flat chronological list,
        // same "basics first" scope as the rest of this pass. Pushes live
        // to the admin dashboard (added 2026-09-30, closing a real gap
        // found live the same day: admin only ever saw a reply on manual
        // refresh).
        group.MapPost("/", async (SendUserMessageRequest request, HttpContext httpContext, AppDbContext db, IHubContext<MessagesHub> hub) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;

            if (string.IsNullOrWhiteSpace(request.Body))
            {
                return Results.BadRequest(new { message = "Message body is required." });
            }

            var purchases = await db.Purchases.Where(p => p.UserId == user.Id).ToListAsync();
            var effectiveTier = EffectiveTierCalculator.Compute(purchases);

            if (effectiveTier is not (EffectiveTier.Tier2 or EffectiveTier.Tier3))
            {
                return Results.Json(
                    new { message = "Replying is available on Tier 2 and above." },
                    statusCode: StatusCodes.Status403Forbidden);
            }

            var message = new Message
            {
                UserId = user.Id,
                Subject = "Message from you",
                Body = request.Body.Trim(),
                Sender = MessageSender.User,
            };
            db.Messages.Add(message);
            await db.SaveChangesAsync();

            var response = ToResponse(message);
            await hub.PushNewReplyAsync(user.Id, response);

            return Results.Ok(response);
        });

        // Mints a short-lived, single-use ticket for the SignalR connection
        // — see LiveMessagingTicketStore's comment for why this exists
        // instead of the browser using the real session token directly.
        // Tier2+ only: no point handing out a connection credential to a
        // tier that has no live-push feature to receive.
        group.MapPost("/live-token", async (HttpContext httpContext, AppDbContext db, LiveMessagingTicketStore ticketStore) =>
        {
            var user = (User)httpContext.Items["CurrentUser"]!;

            var purchases = await db.Purchases.Where(p => p.UserId == user.Id).ToListAsync();
            var effectiveTier = EffectiveTierCalculator.Compute(purchases);

            if (effectiveTier is not (EffectiveTier.Tier2 or EffectiveTier.Tier3))
            {
                return Results.Json(
                    new { message = "Live messaging is available on Tier 2 and above." },
                    statusCode: StatusCodes.Status403Forbidden);
            }

            return Results.Ok(new { ticket = ticketStore.IssueTicket(user.Id) });
        });

        // The admin-side counterpart of the user attachment endpoint above
        // — lets the founder re-download exactly what was sent, e.g. to
        // double-check a delivery. Registered outside the session-filtered
        // group since it's admin-key, not session, protected.
        app.MapGet("/admin/messages/{id:guid}/attachment", async (Guid id, AppDbContext db, AzureBlobStorageService storage) =>
        {
            var message = await db.Messages.FindAsync(id);
            if (message?.AttachmentBlobName is null)
            {
                return Results.NotFound();
            }

            var url = storage.GenerateReadSasUri(message.AttachmentBlobName, downloadFileName: message.AttachmentFileName);
            return Results.Ok(new { url = url.AbsoluteUri });
        }).AddEndpointFilter<AdminAuthFilter>();
    }

    // Shared with DocumentsAdminEndpoints.cs's AdminUserDetailResponse,
    // which builds its own MessageResponse list from the same Message rows
    // — kept in sync here rather than duplicating the mapping.
    public static MessageResponse ToResponse(Message m) =>
        new(m.Id, m.Subject, m.Body, m.CreatedAt, m.ReadAt, m.Sender.ToString(),
            m.AttachmentBlobName is not null, m.AttachmentFileName);

    // Shared by DocumentsAdminEndpoints.cs's two admin-message-creation
    // paths (the free-text send, and the Deny/FlagRed auto-message) plus
    // CvRequestsAdminEndpoints.cs's real CV/cover-letter delivery, so the
    // "create it, then push live if the recipient can receive it" logic
    // lives in one place. Live push only fires for Tier2+ — Free/Tier1
    // recipients still get the message, just via the existing 45s poll,
    // same as before this feature existed. Attachment params are optional —
    // every existing call site (no attachment) is unaffected.
    public static async Task<Message> CreateAdminMessageAsync(
        AppDbContext db, IHubContext<MessagesHub> hub, Guid userId, string subject, string body,
        string? attachmentBlobName = null, string? attachmentFileName = null, string? attachmentContentType = null)
    {
        var message = new Message
        {
            UserId = userId,
            Subject = subject,
            Body = body,
            AttachmentBlobName = attachmentBlobName,
            AttachmentFileName = attachmentFileName,
            AttachmentContentType = attachmentContentType,
        };
        db.Messages.Add(message);
        await db.SaveChangesAsync();

        var purchases = await db.Purchases.Where(p => p.UserId == userId).ToListAsync();
        var effectiveTier = EffectiveTierCalculator.Compute(purchases);

        if (effectiveTier is EffectiveTier.Tier2 or EffectiveTier.Tier3)
        {
            await hub.PushNewMessageAsync(userId, ToResponse(message));
        }

        return message;
    }
}
