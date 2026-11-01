import {
  TIER1_PRICE_EUR,
  getTier2PriceEur,
  isTier1PurchaseEnabled,
  isTier2PurchaseEnabled,
} from '@/lib/tier-pricing';
import { TierCard, BRONZE_BULLETS_TAIL, SILVER_BULLETS } from '@/components/tier-card';
import type { EffectiveTier } from '@/lib/contracts/account';

const TIER_RANK: Record<EffectiveTier, number> = { Free: 0, Tier1: 1, Tier2: 2, Tier3: 3 };

// Replaces the old single-purpose cards (the inline Tier1-unlock box that
// lived in account/page.tsx, and the standalone Tier2UpsellCard) — both only
// ever offered the *next* tier up. Monetization-Strategy.md §4.2a's scenario
// matrix found a Free or Tier1 user had no way to discover Tier 2 directly,
// only Tier 1 — the exact same "only adjacent tier" gap the founder flagged
// for Tier 3. This renders every paid tier still above the user's current
// one in a single list, so a skip-ahead purchase is always visible without
// per-pair special-casing, and stays correct automatically if a tier's scope
// or price changes later.
//
// Tier 3 is deliberately NOT included here — it isn't self-checkout (a real
// conversation happens first, see tier3-request.tsx's own comment), so it's
// always rendered separately and unconditionally by Tier3RequestCard,
// regardless of effectiveTier, rather than folded into this "next paid
// tier, buy instantly" list.
//
// Round 6: /account switched from its old stacked, plain-green-box styling
// (a second, separate rendering branch this component used to carry) to
// this same tight-card styling — the old branch had zero remaining callers
// once that happened, so it was deleted rather than left as dead code.
//
// The card markup itself moved into the shared TierCard component
// (tier-card.tsx) — only the per-tier price/bullet content specific to this
// context (the dynamic match count, the carry-up Silver price) lives here
// now.
export function TierUpgradeOptions({
  effectiveTier,
  blurredCount,
}: {
  effectiveTier: EffectiveTier;
  // /matches-specific: lets Tier1's heading say "Unlock all 35 matches"
  // instead of a generic line, same specificity the old UnlockBanner had.
  // Omitted (e.g. on /account, where there's no blurred match count) falls
  // back to generic copy.
  blurredCount?: number;
}) {
  const rank = TIER_RANK[effectiveTier];
  const showTier1 = rank < TIER_RANK.Tier1 && isTier1PurchaseEnabled();
  const showTier2 = rank < TIER_RANK.Tier2 && isTier2PurchaseEnabled();

  if (!showTier1 && !showTier2) {
    return null;
  }

  // A Fragment, deliberately not its own wrapping flex div — the caller
  // (/matches, /account) already provides one shared row/grid that this and
  // Tier3RequestCard both render directly into. A nested flex container
  // here would make the *whole* Tier1+Tier2 block act as a single flex item
  // from the outer row's perspective — real bug found live 2026-10-24: Tier
  // 3 kept wrapping onto its own line no matter how narrow Tier1/Tier2's
  // min-width got, because the outer row was only ever flexing two items
  // (this whole block, and Tier3's card), never the three individual cards
  // a user actually sees.
  return (
    <>
      {showTier1 && (
        <TierCard
          variant="bronze"
          price={`€${TIER1_PRICE_EUR}`}
          bullets={[
            blurredCount !== undefined && blurredCount > 0
              ? `Unlock all ${blurredCount + 1} matches`
              : 'Unlock every match',
            ...BRONZE_BULLETS_TAIL,
          ]}
          href="/plans/tier-1"
        />
      )}

      {showTier2 && (
        <TierCard
          variant="silver"
          price={`€${getTier2PriceEur(effectiveTier)}`}
          bullets={SILVER_BULLETS}
          href="/plans/tier-2"
        />
      )}
    </>
  );
}
