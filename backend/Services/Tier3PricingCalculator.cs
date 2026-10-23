using Novira.Backend.Models;

namespace Novira.Backend.Services;

// The Tier 3 upfront fee, carry-up adjusted — Monetization-Strategy.md
// §4.2a: €500 flat, minus whatever the user already paid into Tier 1/2, so
// the lifetime total across all purchases is always €1,500. Stateless and
// recomputed from the Purchase ledger, same "recompute from source of
// truth" discipline EffectiveTierCalculator already follows — the result
// gets frozen onto Tier3Case.UpfrontAmountEur at send-agreement time rather
// than called again later, so a purchase made after the agreement was sent
// can't retroactively change what was already agreed to.
public static class Tier3PricingCalculator
{
    private const int FullUpfrontEur = 500;
    private const int Tier1CreditEur = 30;
    private const int Tier2CreditEur = 150;

    public static int GetUpfrontAmountEur(IEnumerable<Purchase> purchases)
    {
        var list = purchases as IReadOnlyCollection<Purchase> ?? purchases.ToList();

        var credit = 0;
        if (list.Any(p => p.Tier == PurchaseTier.Tier2 && p.Status == PurchaseStatus.Paid))
        {
            credit = Tier2CreditEur;
        }
        else if (list.Any(p => p.Tier == PurchaseTier.Tier1 && p.Status == PurchaseStatus.Paid))
        {
            credit = Tier1CreditEur;
        }

        return FullUpfrontEur - credit;
    }
}
