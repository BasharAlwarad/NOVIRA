namespace Novira.Backend.Models;

// Proves "this browser owns this email address" — short-lived and single-use,
// distinct from Session (which proves "this browser is logged in" over a much
// longer window). Never stores the raw token, only its hash, per OWASP's
// Forgot Password Cheat Sheet guidance (the same discipline applies to any
// bearer secret sent via an email link, not just password resets) — a DB
// read alone should never hand out a working link.
public class MagicLinkToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required Guid UserId { get; set; }
    public required string TokenHash { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // The profile snapshot from /auth/request-link, held here — not written
    // onto the User row — until the token is actually consumed at
    // /auth/verify. This is the fix for a real vulnerability (found in code
    // review 2026-08-28): applying it at request time let anyone who merely
    // knows a victim's email silently overwrite their stored profile
    // without ever proving they own that inbox. JSON-serialized ProfileSnapshot.
    public string? PendingProfileJson { get; set; }
}
