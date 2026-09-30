using Microsoft.AspNetCore.SignalR;
using Novira.Backend.Endpoints;
using Novira.Backend.Services;

namespace Novira.Backend.Hubs;

// Live push for the in-app Messages system — Tier2+ only (see Message.cs's
// comment) on the user side. Two directions, both live as of 2026-09-30:
// admin sends -> Tier2+ user gets it instantly, and a Tier2+ user's reply
// -> the admin dashboard gets it instantly too (closing the gap found live
// the same day: the admin side only ever refreshed on page load/manual
// reload).
//
// Single ASP.NET Core instance, in-memory SignalR (no Redis backplane) —
// correct for where this app actually is (one backend instance, one
// founder), not a permanent architecture decision. If this backend is ever
// scaled to multiple instances, group membership here would need to move
// to a backplane (SignalR's own StackExchangeRedis package) for pushes to
// reach a user connected to a different instance than the one handling the
// triggering request.
public class MessagesHub(LiveMessagingTicketStore ticketStore, IConfiguration configuration) : Hub
{
    public const string UserGroupPrefix = "user-";
    public const string AdminGroup = "admins";

    // Auth here is NOT the [Authorize] attribute's cookie/JWT-based scheme —
    // this app doesn't use either. Two credential shapes arrive the same
    // way, as ?access_token= on the connection URL (SignalR's client
    // accessTokenFactory sends it there for WebSocket/SSE transports, since
    // browsers can't attach custom headers to a WebSocket handshake):
    // - The user-facing frontend sends a short-lived, single-use ticket
    //   (see LiveMessagingTicketStore) — the real session token never
    //   leaves the server.
    // - The admin frontend sends the real Admin:Key directly — consistent
    //   with how every other admin request already trusts the browser with
    //   that same shared key (AdminAuthFilter), so no extra ticket
    //   indirection buys anything extra here.
    public override async Task OnConnectedAsync()
    {
        var rawToken = Context.GetHttpContext()?.Request.Query["access_token"].ToString();

        if (string.IsNullOrEmpty(rawToken))
        {
            Context.Abort();
            return;
        }

        var configuredAdminKey = configuration["Admin:Key"];
        if (!string.IsNullOrWhiteSpace(configuredAdminKey) && rawToken == configuredAdminKey)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, AdminGroup);
            await base.OnConnectedAsync();
            return;
        }

        var userId = ticketStore.ConsumeTicket(rawToken);
        if (userId is null)
        {
            Context.Abort();
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, $"{UserGroupPrefix}{userId}");
        await base.OnConnectedAsync();
    }
}

// The payload pushed to the admin group — includes UserId (unlike the
// user-facing push, where the recipient's own group membership already
// scopes it) since one admin connection receives replies from every user.
public record NewReplyPush(Guid UserId, MessageResponse Message);

public static class MessagesHubExtensions
{
    // "newMessage" / "newReply" are the event names the frontend's SignalR
    // clients listen for (see useLiveMessages.ts / useAdminLiveMessages.ts)
    // — kept as plain string constants here rather than a shared contract
    // file, since SignalR's own protocol already couples client/server on
    // the method name string.
    public static Task PushNewMessageAsync(this IHubContext<MessagesHub> hub, Guid userId, MessageResponse message) =>
        hub.Clients.Group($"{MessagesHub.UserGroupPrefix}{userId}").SendAsync("newMessage", message);

    public static Task PushNewReplyAsync(this IHubContext<MessagesHub> hub, Guid userId, MessageResponse message) =>
        hub.Clients.Group(MessagesHub.AdminGroup).SendAsync("newReply", new NewReplyPush(userId, message));
}
