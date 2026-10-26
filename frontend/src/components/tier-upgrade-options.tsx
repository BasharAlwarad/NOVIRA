import Link from 'next/link';
import { Award, CheckCircle2, Medal } from 'lucide-react';
import {
  TIER1_PRICE_EUR,
  getTier2PriceEur,
  isTier1PurchaseEnabled,
  isTier2PurchaseEnabled,
} from '@/lib/tier-pricing';
import { TierBadge } from '@/components/tier-badge';
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
  // (/matches, /account) already provides one shared `flex flex-wrap` row
  // that this and Tier3RequestCard both render directly into. A nested flex
  // container here would make the *whole* Tier1+Tier2 block act as a
  // single flex item from the outer row's perspective — real bug found
  // live 2026-10-24: Tier 3 kept wrapping onto its own line no matter how
  // narrow Tier1/Tier2's min-width got, because the outer row was only
  // ever flexing two items (this whole block, and Tier3's card), never
  // the three individual cards a user actually sees.
  //
  // Bronze/Silver/Gold (this card's two, Tier 3's gold lives in
  // tier3-request.tsx) applies to the badge/border/background tint only —
  // the action button stays visually identical across all three cards on
  // purpose (explicit feedback: "buttons must be consistent"), and each
  // card is `flex flex-col` with the button pinned via `mt-auto` so all
  // three buttons land on the same baseline regardless of bullet count.
  return (
    <>
      {showTier1 && (
          <div className="flex min-w-48 flex-1 flex-col overflow-hidden rounded-3xl bg-white shadow-sm transition-shadow duration-200 hover:shadow-lg">
            <div className="bg-linear-to-br from-amber-800 to-amber-700 px-5 pt-5 pb-9">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">Bronze</p>
              <p className="text-lg font-bold text-white">€{TIER1_PRICE_EUR}</p>
            </div>
            <div className="flex flex-1 flex-col p-5 pt-0">
              <TierBadge icon={Medal} iconColorClass="text-amber-800" starCount={1} />
              <h3 className="mt-2 text-center text-base font-bold text-slate-900">
                {blurredCount !== undefined && blurredCount > 0
                  ? `Unlock all ${blurredCount + 1} matches`
                  : 'Unlock every match'}
              </h3>
              <ul className="mt-3 space-y-1.5 text-sm leading-6 text-slate-600">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <span>Every matching opportunity, not just one</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <span>A real human review of your profile</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <span>See how you compare to each program&apos;s real requirements</span>
                </li>
              </ul>
              <div className="mt-auto pt-3">
                <Link
                  href="/plans/tier-1"
                  className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-600"
                >
                  Read more
                </Link>
              </div>
            </div>
          </div>
        )}

        {showTier2 && (
          <div className="flex min-w-48 flex-1 flex-col overflow-hidden rounded-3xl bg-white shadow-sm transition-shadow duration-200 hover:shadow-lg">
            <div className="bg-linear-to-br from-slate-600 to-slate-500 px-5 pt-5 pb-9">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-100">Silver</p>
              <p className="text-lg font-bold text-white">€{getTier2PriceEur(effectiveTier)}</p>
            </div>
            <div className="flex flex-1 flex-col p-5 pt-0">
              <TierBadge icon={Award} iconColorClass="text-slate-600" starCount={2} />
              <h3 className="mt-2 text-center text-base font-bold text-slate-900">Get application support</h3>
              <ul className="mt-3 space-y-1.5 text-sm leading-6 text-slate-600">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <span>A CV and cover letter for every application</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <span>One structured interview to help you prepare</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <span>Direct messaging with our team</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <span>Priority notice on new matches</span>
                </li>
              </ul>
              <div className="mt-auto pt-3">
                <Link
                  href="/plans/tier-2"
                  className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-600"
                >
                  Read more
                </Link>
              </div>
            </div>
          </div>
        )}
    </>
  );
}
