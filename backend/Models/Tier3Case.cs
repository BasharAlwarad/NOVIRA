namespace Novira.Backend.Models;

// Postgres-int-backed (EF's default for enums) — append only, never reorder
// or insert mid-list, same discipline as OpportunitySource/PurchaseTier.
// Deliberately one linear pipeline, not a branching state machine — Tier 3
// is "not self-checkout" (Monetization-Strategy.md §4.1), so a case always
// moves through a real conversation before any money or signature happens.
public enum Tier3CaseStatus
{
    Requested,
    ConsultationScheduled,
    AgreementSigned,
    ActiveSearch,
    ApplicationSubmitted,
    Secured,
    Complete,
    Refunded,
}

// Tier 3's "full service, including applying on the user's behalf"
// (Monetization-Strategy.md §4.1 item 4) — the first piece of it, covering
// just the request + status pipeline. Deliberately does not yet cover
// payment (a real Purchase row, same StripeSessionId-verified pattern
// Tier1/2 already use, is a later step — see Architecture.md's Tier 3 build
// order), the signed agreement itself, or document/application handling.
//
// One row per user, not per opportunity — unlike CvRequest/MatchActivity,
// Tier 3 starts as a general "help me get into Germany" request, not a
// per-match action. The specific opportunity being pursued (if any) is
// filled in later, once the founder's own active search identifies one —
// this mirrors how the real-world "fixer" pattern Monetization-Strategy.md
// §4.5 documents actually works (talk first, target second), not a
// Request-a-CV-style instant per-match action.
public class Tier3Case
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required Guid UserId { get; set; }
    public Tier3CaseStatus Status { get; set; } = Tier3CaseStatus.Requested;

    // Null until the founder's active search identifies a specific
    // opportunity to pursue. Snapshotted (not a live join) once set, same
    // "a historical record must never change out from under you" reasoning
    // as CvRequest.OpportunityTitle/OpportunityProvider — archiving the
    // underlying Opportunity later must not corrupt what this case is
    // actually about.
    public Guid? TargetOpportunityId { get; set; }
    public string? TargetOpportunityTitle { get; set; }
    public string? TargetOpportunityProvider { get; set; }

    // Founder-only context (case notes, what was discussed on the
    // consultation call, etc.) — never shown to the user, distinct from the
    // in-app Messages thread, which is the user-visible channel.
    public string? AdminNotes { get; set; }

    // The agreement + upfront payment step (Architecture.md's "Tier 3
    // agreement + payment" section). "Agreement sent, not yet signed" is a
    // computed sub-state (AgreementSentAt set, SignedAt null) rather than a
    // new Tier3CaseStatus value — avoids enum churn for a sub-state that
    // doesn't need its own place in the linear pipeline above.
    public DateTime? AgreementSentAt { get; set; }

    // A snapshot of exactly what the Client was shown, not a live reference
    // to the template — the audit trail has to reflect what was actually
    // presented and agreed to, even if the template text changes later.
    public string? AgreementText { get; set; }

    // The carry-up-adjusted amount (Tier3PricingCalculator), frozen at send
    // time so a later purchase elsewhere can't retroactively change what was
    // already agreed to.
    public int? UpfrontAmountEur { get; set; }

    public DateTime? SignedAt { get; set; }
    public string? SignedFullName { get; set; }
    public string? SignerIp { get; set; }

    // The €1,000 success fee (build order step 5) — already contractually
    // agreed to in the signed agreement above (Section 3/4), so no second
    // signature is needed here, just the payment. Verified through its own
    // dedicated endpoint, not /purchases/verify-session — see
    // Architecture.md's "Tier 3 success fee" section for why.
    public DateTime? SuccessFeeRequestedAt { get; set; }
    public DateTime? SuccessFeePaidAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
