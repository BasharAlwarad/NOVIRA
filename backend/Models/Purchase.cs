namespace Novira.Backend.Models;

// The three paid tiers — see Monetization-Strategy.md §4.1 for the current
// scope/price of each (deliberately not restated here or anywhere in code
// comments, since it's been revised five times already; this enum only
// needs to distinguish which tier a purchase was for, not what it costs).
// Postgres-int-backed (EF's default for enums) — append only, never
// reorder or insert mid-list, same discipline as OpportunitySource.
public enum PurchaseTier
{
    Tier1,
    Tier2,
    Tier3,
}

// A purchase row is only ever created *after* a payment is verified server-
// side against Stripe (see the checkout-session-verification endpoint) —
// there's no "Pending" status, unlike UserDocument's review pipeline, since
// nothing here needs human review before it counts. Refunded is the one
// exception to "immutable once created": a Tier 3 refund flips this in
// place rather than deleting the row, since the row itself (which tier, how
// much, when) is what "drops back to Tier 1 level" (see EffectiveTier
// below) needs to reason about — deleting it would lose that history.
public enum PurchaseStatus
{
    Paid,
    Refunded,
}

// One row per real, verified payment — an append-mostly ledger, not a
// mutable "current tier" flag on User. A user's actual unlock level is
// always computed from this table (see EffectiveTier.Compute), the same
// "recompute from source of truth" discipline already used for the
// Verified* profile fields (DocumentsAdminEndpoints.cs's
// RecomputeVerifiedData) — avoids a stored flag ever drifting out of sync
// with what was actually paid, and doubles as the real conversion-tracking
// data Monetization-Strategy.md §4.3 asked for, with no separate analytics
// table needed.
public class Purchase
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required Guid UserId { get; set; }
    public required PurchaseTier Tier { get; set; }
    public required int AmountEur { get; set; }

    // The Stripe Checkout Session ID this purchase was verified against.
    // Unique — this is what stops a successful payment's redirect URL from
    // being replayed to unlock a second time (either the same account
    // twice, or a different account entirely). See the verification
    // endpoint for how this gets checked before a row is ever inserted.
    public required string StripeSessionId { get; set; }

    public PurchaseStatus Status { get; set; } = PurchaseStatus.Paid;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RefundedAt { get; set; }
}
