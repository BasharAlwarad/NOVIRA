import {
  TIER1_PRICE_EUR,
  TIER2_PRICE_EUR,
  getTier1PaymentLink,
  getTier2PaymentLink,
  isTier1PurchaseEnabled,
  isTier2PurchaseEnabled,
} from '@/lib/tier-pricing';
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
export function TierUpgradeOptions({
  effectiveTier,
  includeTier1 = true,
}: {
  effectiveTier: EffectiveTier;
  // Suppressed on /matches' Free-tier view specifically, where
  // UnlockBanner already renders the identical Tier 1 offer inline next to
  // the blurred matches — showing the same €30 CTA twice on one screen
  // would be redundant, not reinforcing.
  includeTier1?: boolean;
}) {
  const rank = TIER_RANK[effectiveTier];
  const showTier1 = includeTier1 && rank < TIER_RANK.Tier1 && isTier1PurchaseEnabled();
  const showTier2 = rank < TIER_RANK.Tier2 && isTier2PurchaseEnabled();

  if (!showTier1 && !showTier2) {
    return null;
  }

  return (
    <div className="space-y-3">
      {showTier1 && (
        <div className="rounded-2xl bg-emerald-50/60 p-4">
          <p className="text-sm font-semibold text-emerald-900">
            Unlock all your matches — €{TIER1_PRICE_EUR}
          </p>
          <p className="mt-1 text-sm leading-6 text-emerald-800">
            See every matching opportunity (not just one), plus a quick human review of your
            profile.
          </p>
          <a
            href={getTier1PaymentLink()}
            className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-emerald-500 px-5 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            Unlock — €{TIER1_PRICE_EUR}
          </a>
        </div>
      )}

      {showTier2 && (
        <div className="rounded-2xl bg-emerald-50/60 p-4">
          <p className="text-sm font-semibold text-emerald-900">
            Get application support — €{TIER2_PRICE_EUR}
          </p>
          <ol className="mt-2 space-y-1.5 text-sm leading-6 text-emerald-800">
            <li>1. A CV and cover letter prepared for each application you submit</li>
            <li>2. Personalized advice on how to apply</li>
            <li>3. One structured interview to help you get ready</li>
            <li>4. Priority notice when new matching opportunities are added</li>
            <li>5. Live two-way messaging with our team</li>
          </ol>
          <p className="mt-2 text-xs text-emerald-700">You still submit your own applications.</p>
          <a
            href={getTier2PaymentLink()}
            className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-emerald-500 px-5 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            Get started — €{TIER2_PRICE_EUR}
          </a>
        </div>
      )}
    </div>
  );
}
