namespace Novira.Backend.Services;

public record DevMagicLinkEntry(string Email, string VerifyUrl, DateTime CreatedAt);

// A development-only convenience: Resend's free sandbox tier can only
// deliver to the account owner's own exact email address (see CLAUDE.md's
// pre-deployment blockers — "the single most urgent item"), so every other
// test address (including any `+tag` variant of the founder's own address)
// never actually receives the real magic-link email. AuthEndpoints.cs
// already logs the raw link to the console in Development for exactly this
// reason; this store captures the same thing into memory so it can be
// browsed on a real page instead of scrolled for in a terminal — nothing
// new is exposed that wasn't already being printed to the console.
//
// Singleton (not scoped), same reasoning as LiveMessagingTicketStore: its
// whole job is holding state across separate HTTP requests. Never persisted
// to the database — the raw token only ever exists here and in the
// one-time response/log line, by design (MagicLinkToken only stores a
// hash) — so this list is lost on restart, which is fine for a dev
// convenience.
public class DevMagicLinkStore
{
    private const int MaxEntries = 25;
    private readonly object _lock = new();
    private readonly LinkedList<DevMagicLinkEntry> _entries = new();

    public void Record(string email, string verifyUrl)
    {
        lock (_lock)
        {
            _entries.AddFirst(new DevMagicLinkEntry(email, verifyUrl, DateTime.UtcNow));
            while (_entries.Count > MaxEntries)
            {
                _entries.RemoveLast();
            }
        }
    }

    public IReadOnlyList<DevMagicLinkEntry> GetRecent()
    {
        lock (_lock)
        {
            return _entries.ToList();
        }
    }
}
