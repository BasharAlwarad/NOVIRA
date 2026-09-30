using System.Collections.Concurrent;

namespace Novira.Backend.Services;

// A short-lived, single-use credential for opening a SignalR connection —
// exists specifically so the browser never needs the real session token.
// The session token is deliberately an HttpOnly cookie the browser's JS can
// never read (see AuthEndpoints.cs); a direct browser-to-backend WebSocket
// connection can't use that cookie, so instead of weakening that property,
// the Next.js server (which does have the cookie) exchanges it server-side
// for one of these tickets and hands only the ticket to client JS.
//
// In-memory, not DB-backed — a ticket lives for 30 seconds and is consumed
// exactly once, so persisting it would outlive its own usefulness. Same
// "single-instance in-memory is fine for now" scope call already made for
// the Hub's own connection groups; revisit only if this backend is ever
// scaled to multiple instances (see the Hub's own comment).
public class LiveMessagingTicketStore
{
    private static readonly TimeSpan TicketLifetime = TimeSpan.FromSeconds(30);

    private readonly ConcurrentDictionary<string, (Guid UserId, DateTime ExpiresAt)> _tickets = new();

    public string IssueTicket(Guid userId)
    {
        var raw = TokenGenerator.GenerateRawToken();
        _tickets[raw] = (userId, DateTime.UtcNow.Add(TicketLifetime));
        return raw;
    }

    public Guid? ConsumeTicket(string rawTicket)
    {
        if (_tickets.TryRemove(rawTicket, out var entry) && entry.ExpiresAt >= DateTime.UtcNow)
        {
            return entry.UserId;
        }

        return null;
    }
}
