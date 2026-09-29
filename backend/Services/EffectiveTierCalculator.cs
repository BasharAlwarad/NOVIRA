using Novira.Backend.Models;

namespace Novira.Backend.Services;

// What a user can actually see/unlock right now — distinct from PurchaseTier
// (what a single purchase was for), since a user's overall level is derived
// from their whole purchase history, not one row. Free means the blur-then-
// unlock default on /matches; Tier1/2/3 mirror Monetization-Strategy.md
// §4.1's tiers.
public enum EffectiveTier
{
    Free,
    Tier1,
    Tier2,
    Tier3,
}

// Deliberately stateless and recomputed from the Purchase ledger every time,
// never cached on User — same "recompute from source of truth" discipline
// DocumentsAdminEndpoints.cs's RecomputeVerifiedData already uses for the
// Verified* profile fields, for the same reason: a stored flag can drift
// out of sync with what was actually paid, a recomputation from the real
// records can't.
public static class EffectiveTierCalculator
{
    public static EffectiveTier Compute(IEnumerable<Purchase> purchases)
    {
        var list = purchases as IReadOnlyCollection<Purchase> ?? purchases.ToList();

        if (list.Any(p => p.Tier == PurchaseTier.Tier3 && p.Status == PurchaseStatus.Paid))
        {
            return EffectiveTier.Tier3;
        }

        if (list.Any(p => p.Tier == PurchaseTier.Tier2 && p.Status == PurchaseStatus.Paid))
        {
            return EffectiveTier.Tier2;
        }

        // A refunded Tier 3 purchase grants Tier 1-level access, not zero —
        // per Monetization-Strategy.md §4.1 item 5's "drops back to Tier 1,
        // not the free blurred view" rule, since Tier 1 is the effective
        // floor once any payment has been made.
        var hasTier1Access = list.Any(p => p.Tier == PurchaseTier.Tier1 && p.Status == PurchaseStatus.Paid)
            || list.Any(p => p.Tier == PurchaseTier.Tier3 && p.Status == PurchaseStatus.Refunded);

        return hasTier1Access ? EffectiveTier.Tier1 : EffectiveTier.Free;
    }
}
