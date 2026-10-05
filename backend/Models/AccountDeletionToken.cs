namespace Novira.Backend.Models;

// Proves "this browser owns this email address" for the specific purpose of
// confirming account deletion — deliberately a separate table from
// MagicLinkToken rather than reusing it with a "purpose" flag, so a token
// minted for sign-in can never accidentally be valid for deletion or vice
// versa. Same hash-only-at-rest, single-use, short-lived discipline as
// MagicLinkToken (see its own comment for the OWASP reasoning).
public class AccountDeletionToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required Guid UserId { get; set; }
    public required string TokenHash { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // The stated reason for leaving, held here (not written to the User row)
    // until the token is actually consumed at /account/confirm-delete —
    // same "nothing consequential written until ownership is proven" rule
    // PendingProfileJson already established on MagicLinkToken. Optional —
    // asking why someone's leaving should never be the thing that blocks
    // them from leaving.
    public string? Reason { get; set; }
}
