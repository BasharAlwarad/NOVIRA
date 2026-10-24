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
  compact = false,
  blurredCount,
}: {
  effectiveTier: EffectiveTier;
  // Only meaningful when NOT compact — the old /matches layout suppressed
  // Tier1 here because a separate UnlockBanner already covered it. The
  // compact layout folds Tier1 directly into this row instead (see
  // blurredCount below), so callers using compact should leave this at its
  // default (true).
  includeTier1?: boolean;
  // The tight-card row style (found 2026-10-24: /matches' original stacked,
  // verbose cards — Tier1's own box, Tier2's 5-item list — amounted to too
  // much to read before a user ever got back to their actual matches).
  // Mirrors /#services' already-established compact card language (price
  // label, bold heading, one tight sentence) instead of inventing a new
  // style, plus a compact CTA button each card still needs that the
  // homepage's purely-marketing cards don't. `false` (the default) keeps
  // /account's existing stacked, more detailed cards completely unchanged —
  // this is an opt-in per caller, not a global redesign.
  compact?: boolean;
  // /matches-specific: lets Tier1's compact heading say "Unlock all 35
  // matches" instead of a generic line, same specificity the old
  // UnlockBanner had. Omitted (e.g. on /account, where there's no blurred
  // match count) falls back to generic copy.
  blurredCount?: number;
}) {
  const rank = TIER_RANK[effectiveTier];
  const showTier1 = includeTier1 && rank < TIER_RANK.Tier1 && isTier1PurchaseEnabled();
  const showTier2 = rank < TIER_RANK.Tier2 && isTier2PurchaseEnabled();

  if (!showTier1 && !showTier2) {
    return null;
  }

  if (compact) {
    // A Fragment, deliberately not its own wrapping flex div — the caller
    // (e.g. /matches) already provides one shared `flex flex-wrap` row that
    // this and Tier3RequestCard both render directly into. A nested flex
    // container here would make the *whole* Tier1+Tier2 block act as a
    // single flex item from the outer row's perspective — real bug found
    // live 2026-10-24: Tier 3 kept wrapping onto its own line no matter how
    // narrow Tier1/Tier2's min-width got, because the outer row was only
    // ever flexing two items (this whole block, and Tier3's card), never
    // the three individual cards a user actually sees.
    return (
      <>
        {showTier1 && (
          <div className="min-w-48 flex-1 space-y-2 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Tier 1 — €{TIER1_PRICE_EUR}
            </p>
            <h3 className="text-base font-bold text-emerald-950">
              {blurredCount !== undefined && blurredCount > 0
                ? `Unlock all ${blurredCount + 1} matches`
                : 'Unlock every match'}
            </h3>
            <p className="text-sm leading-6 text-emerald-800">
              Every opportunity that fits your profile, plus a human review.
            </p>
            <a
              href={getTier1PaymentLink()}
              className="mt-1 inline-flex h-9 items-center justify-center rounded-full bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              Unlock — €{TIER1_PRICE_EUR}
            </a>
          </div>
        )}

        {showTier2 && (
          <div className="min-w-48 flex-1 space-y-2 rounded-3xl bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Tier 2 — €{TIER2_PRICE_EUR}
            </p>
            <h3 className="text-base font-bold text-slate-900">Get application support</h3>
            <p className="text-sm leading-6 text-slate-600">
              AI-drafted CVs for each application, real-time chat, and application tracking.
            </p>
            <a
              href={getTier2PaymentLink()}
              className="mt-1 inline-flex h-9 items-center justify-center rounded-full bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              Get started — €{TIER2_PRICE_EUR}
            </a>
          </div>
        )}
      </>
    );
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
