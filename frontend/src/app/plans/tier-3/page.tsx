import Link from 'next/link';
import { CheckCircle2, Crown } from 'lucide-react';
import { SiteFooter } from '@/components/site-footer';
import { SiteNav } from '@/components/site-nav';
import { Tier3RequestCard } from '@/components/tier3-request';
import { TIER3_UPFRONT_EUR, TIER3_SUCCESS_FEE_EUR } from '@/lib/tier-pricing';

// The Tier 3 destination for the compact card's "Read more" button
// (round 4 of the /matches tier-card redesign — see Architecture.md).
// Unlike Tier 1/2, the real CTA here isn't a static link — it's the
// existing, full (non-compact) Tier3RequestCard, already stateful
// (self-fetches the case, correctly shows request/signing/payment/status).
// Reusing it here means zero new request/payment logic for this page, just
// a different placement. effectiveTier="Free" is a safe static default for
// an anonymous/public page view — the prop only matters for one edge case
// (an already-Tier3 user with no case on record), which doesn't change
// behavior in any way that's harmful here.
export default function Tier3PlanPage() {
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
          <div className="bg-linear-to-br from-yellow-600 to-yellow-500 px-6 pt-10 pb-14 sm:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-100">Gold — Tier 3</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Get full-service help</h1>
            <p className="mt-2 text-xl font-semibold text-yellow-100">
              €{TIER3_UPFRONT_EUR} upfront + €{TIER3_SUCCESS_FEE_EUR} on success
            </p>
          </div>

          <div className="space-y-10 px-6 pt-0 pb-10 sm:px-10">
            <div className="-mt-10 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-md ring-4 ring-white">
              <Crown className="h-10 w-10 text-yellow-600" />
            </div>
            <section>
              <h2 className="text-lg font-bold text-slate-900">What you get</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-yellow-700" />
                  <span>We help you complete and submit your application, start to finish.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-yellow-700" />
                  <span>A real conversation first, under a signed agreement — nothing starts without it.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-yellow-700" />
                  <span>Ongoing support throughout your case, start to resolution.</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">Why it matters</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Some situations genuinely call for more than guidance — someone to actually carry the
                logistics: organizing documents, preparing materials, corresponding with the
                institution or employer about your specific application. That&apos;s a real commitment
                of time most people juggling a job, a move, or limited familiarity with German
                bureaucracy don&apos;t have spare. This tier exists for exactly that — not because the
                outcome changes, but because the process itself becomes someone else&apos;s job instead
                of yours.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">How it works</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Request full-service help, and we schedule a real conversation first — no payment, no
                commitment yet. If it&apos;s a good fit, you&apos;ll receive a signed agreement covering
                exactly what&apos;s included and what it costs (the €{TIER3_UPFRONT_EUR}{' '}
                upfront accounts
                for any Tier 1/2 payment you&apos;ve already made — you never pay twice for the same
                thing), and once that&apos;s signed and the upfront fee is paid, we get to work on your
                case. The remaining €{TIER3_SUCCESS_FEE_EUR} is only due if the application succeeds —
                defined precisely in the agreement itself (actual enrollment for university, a signed
                training contract for Ausbildung), not on a mere offer.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">What this isn&apos;t</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                No outcome is ever guaranteed — we make a genuine, good-faith effort, but the decision
                always belongs to the institution or employer, never to us. Not legal or immigration
                advice; visa/residence-permit questions go to a licensed immigration lawyer, same as
                every other tier.
              </p>
            </section>

            <div className="border-t border-slate-100 pt-8">
              <Tier3RequestCard effectiveTier="Free" />
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
