using Novira.Backend.Models;

namespace Novira.Backend.Services;

// Tier 2's carry-up discount — the one missing scenario from
// Tier3PricingCalculator.cs's own pattern: a user who already paid Tier1's
// €30 pays €120, not €150, for Tier2, so the lifetime total stays €150
// either way. Stateless and recomputed from the Purchase ledger, same
// "recompute from source of truth" discipline Tier3PricingCalculator and
// EffectiveTierCalculator already follow. Unlike Tier3, this is never
// frozen onto a case record — Tier2 stays self-checkout with no agreement
// step, so the expected amount is just recomputed at verify-session time.
public static class Tier2PricingCalculator
{
    private const int FullTier2Eur = 150;
    private const int Tier1CreditEur = 30;

    public static int GetExpectedAmountEur(IEnumerable<Purchase> purchases)
    {
        var hasTier1 = purchases.Any(p => p.Tier == PurchaseTier.Tier1 && p.Status == PurchaseStatus.Paid);
        return hasTier1 ? FullTier2Eur - Tier1CreditEur : FullTier2Eur;
    }
}
