namespace Novira.Backend.Models;

// In-app messages from the NOVIRA team to a user — the in-app replacement
// for document-decision emails and the admin free-text message (previously
// sent purely via ResendEmailService, see DocumentsAdminEndpoints.cs). Kept
// deliberately one-way (admin -> user) for now; there's no user-to-admin
// reply yet, matching CLAUDE.md's original plan scope for this feature.
public class Message
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required Guid UserId { get; set; }
    public required string Subject { get; set; }

    // Plain text, not HTML — rendered as-is on the frontend (React
    // auto-escapes text content, so no injection risk the way the old
    // HTML-email builders had to account for).
    public required string Body { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Null until the user views their account's Messages section — see
    // MessagesEndpoints.cs's POST /messages/read-all. Marking "read" is
    // page-level, not per-message, in this first pass.
    public DateTime? ReadAt { get; set; }
}
