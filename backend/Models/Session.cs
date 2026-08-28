namespace Novira.Backend.Models;

// Represents "this browser is logged in" — created once a MagicLinkToken is
// successfully verified, valid for a much longer window (30 days) than the
// token that created it. A real DB-backed row, not a stateless signed
// cookie: that's what lets logout genuinely revoke a session (delete the
// row) and lets a user stay signed in on more than one device at once,
// rather than every new sign-in silently kicking out the previous device.
// Same hash-not-raw-value discipline as MagicLinkToken — a session token is
// just as sensitive as a login token, a DB leak shouldn't hand out valid
// sessions either.
public class Session
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required Guid UserId { get; set; }
    public required string TokenHash { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
