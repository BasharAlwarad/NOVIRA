using Novira.Backend.Models;

namespace Novira.Backend.Services;

// The server-side source of truth for what each tier costs, in whole
// euros — used only to validate that a Stripe Checkout Session's actual
// paid amount matches what we expect before ever trusting it (never trust
// the client to say how much was paid). Deliberately doesn't restate *why*
// these numbers were chosen — that reasoning lives in
// Monetization-Strategy.md §4.1 and gets revised independently of this
// file; this is just the number this code needs in order to function.
//
// Tier3's figure is the €500 *upfront* checkout amount only — the
// remaining €1,000 success fee is collected separately (not through this
// same session-verification flow) once an opportunity is actually secured.
public static class TierPricing
{
    // Tier1/Tier2 cut 2026-11-12 (Monetization-Strategy.md §4.2c) — early-
    // stage, deliberately low prices to build volume/trust toward the
    // higher tiers; Tier 3 unchanged, kept at its original amount. Real
    // Stripe Payment Links still need to be recreated at these new amounts
    // (founder's own action — see CLAUDE.md's pre-deployment blockers)
    // before this matches what checkout actually charges.
    private static readonly Dictionary<PurchaseTier, int> AmountsEur = new()
    {
        [PurchaseTier.Tier1] = 5,
        [PurchaseTier.Tier2] = 40,
        [PurchaseTier.Tier3] = 500,
    };

    public static int GetExpectedAmountEur(PurchaseTier tier) => AmountsEur[tier];
}
