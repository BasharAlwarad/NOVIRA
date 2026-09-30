namespace Novira.Backend.Models;

// Postgres-int-backed (EF's default for enums) — append only, never
// reorder or insert mid-list, same discipline as OpportunitySource/
// PurchaseTier. Admin is first (value 0) since every pre-existing Message
// row is admin-authored — the migration backfills this column with the
// enum's default, which must stay correct for that history.
public enum MessageSender
{
    Admin,
    User,
}

// In-app messages between the NOVIRA team and a user. Originally one-way
// (admin -> user only, the in-app replacement for document-decision
// emails); two-way replies (Sender=User) were added 2026-09-30, gated to
// Tier2+ (see MessagesEndpoints.cs's POST / and Monetization-Strategy.md
// §4.1) — Free/Tier1 users keep the original one-way experience unchanged.
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

    public MessageSender Sender { get; set; } = MessageSender.Admin;
}
