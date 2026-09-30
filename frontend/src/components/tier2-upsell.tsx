import { TIER2_PRICE_EUR, getTier2PaymentLink, isTier2PurchaseEnabled } from '@/lib/tier-pricing';

// Shared between /account's PlanSection and /matches (both show this to
// Tier1 users, added 2026-09-29 after a Tier1 purchaser had no visible next
// step anywhere in the app). Numbered so each real deliverable reads as its
// own concrete item rather than one run-on sentence. The "coming in the
// future" line is deliberately kept OUTSIDE the numbered list — a numbered
// list of paid benefits reads as "here's what's included," and a
// speculative, no-timeline item mixed in with real (if still manually
// fulfilled) deliverables risks being read as another current inclusion.
// Copy checked against novira-legal-check: "help you prepare/apply," never
// "we apply for you" (that's Tier 3's line), no outcome guarantees, no
// implied consent for a data-sharing flow that doesn't exist yet.
export function Tier2UpsellCard() {
  if (!isTier2PurchaseEnabled()) {
    return null;
  }

  return (
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
      <p className="mt-3 text-xs text-slate-500">
        Coming in the future: employers and companies will be able to see your CV directly.
      </p>
    </div>
  );
}
