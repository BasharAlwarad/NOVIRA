import Link from 'next/link';
import { CheckCircle2, Medal } from 'lucide-react';
import { SiteFooter } from '@/components/site-footer';
import { SiteNav } from '@/components/site-nav';
import { TIER1_PRICE_EUR, getTier1PaymentLink, isTier1PurchaseEnabled } from '@/lib/tier-pricing';

function UnlockButton() {
  if (!isTier1PurchaseEnabled()) {
    return (
      <p className="text-sm text-slate-500">
        Payment isn&apos;t set up yet for this account — contact us via Messages.
      </p>
    );
  }
  return (
    <a
      href={getTier1PaymentLink()}
      className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-500 px-6 text-sm font-semibold text-white transition hover:bg-emerald-600"
    >
      Unlock — €{TIER1_PRICE_EUR}
    </a>
  );
}

// The Tier 1 destination for the compact card's "Read more" button
// (round 4 of the /matches tier-card redesign — see Architecture.md).
// Deliberately a plain, publicly-viewable page (no sign-in required), same
// as /#services — the real purchase still happens via the same static
// Stripe Payment Link it always has, just linked to from here instead of
// directly from the compact card.
export default function Tier1PlanPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteNav />
      <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <Link
          href="/matches"
          className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          ← Back to matches
        </Link>
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="bg-linear-to-br from-amber-800 to-amber-700 px-6 pt-10 pb-14 sm:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">Bronze — Tier 1</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Unlock every match</h1>
            <p className="mt-2 text-xl font-semibold text-amber-100">€{TIER1_PRICE_EUR}</p>
            <div className="mt-6">
              <UnlockButton />
            </div>
          </div>

          <div className="space-y-10 px-6 pt-0 pb-10 sm:px-10">
            <div className="-mt-10 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-md ring-4 ring-white">
              <Medal className="h-10 w-10 text-amber-800" />
            </div>
            <section>
              <h2 className="text-lg font-bold text-slate-900">What you get</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <span>Every matching opportunity, not just one — see the complete list, not a sample.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <span>A real human review of your profile — a person actually looks, not just the matching algorithm.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <span>See exactly how you compare to each program&apos;s own stated requirements.</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">Why it matters</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Self-reported matching has real blind spots. Running your own profile through a form
                catches the obvious things, but a person on our team reviewing it by hand can catch
                what an automated match alone might miss — an inconsistency, a detail you
                under-described, something that changes which programs actually make sense for you.
                And seeing the complete list matters on its own: program deadlines and availability
                shift over time, so planning around one visible match instead of all of them means
                planning with incomplete information. This unlocks everything that&apos;s already been
                found — not a new search, the real, already-matched list.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">How it works</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Pay once, and every matching opportunity on your account unlocks immediately — no
                waiting. Your profile gets a human review alongside the automated matching that&apos;s
                already run, and any notes from that review show up directly on your matches.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">What this isn&apos;t</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                This is a program-fit review — how your profile compares to what each program states
                it needs — not legal or immigration advice, and not an assessment of your visa or
                residence-permit eligibility. Any question that touches that gets referred to a
                licensed immigration lawyer, not answered in-house.
              </p>
            </section>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
