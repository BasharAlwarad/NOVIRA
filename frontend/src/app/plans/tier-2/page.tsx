import Link from 'next/link';
import { Award, CheckCircle2 } from 'lucide-react';
import { SiteFooter } from '@/components/site-footer';
import { SiteNav } from '@/components/site-nav';
import { TIER2_PRICE_EUR, getTier2PaymentLink, isTier2PurchaseEnabled } from '@/lib/tier-pricing';

function UnlockButton() {
  if (!isTier2PurchaseEnabled()) {
    return (
      <p className="text-sm text-slate-500">
        Payment isn&apos;t set up yet for this account — contact us via Messages.
      </p>
    );
  }
  return (
    <a
      href={getTier2PaymentLink()}
      className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-500 px-6 text-sm font-semibold text-white transition hover:bg-emerald-600"
    >
      Unlock — €{TIER2_PRICE_EUR}
    </a>
  );
}

// The Tier 2 destination for the compact card's "Read more" button
// (round 4 of the /matches tier-card redesign — see Architecture.md).
export default function Tier2PlanPage() {
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
          <div className="bg-linear-to-br from-slate-600 to-slate-500 px-6 pt-10 pb-14 sm:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-100">Silver — Tier 2</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Get application support</h1>
            <p className="mt-2 text-xl font-semibold text-slate-100">€{TIER2_PRICE_EUR}</p>
            <div className="mt-6">
              <UnlockButton />
            </div>
          </div>

          <div className="space-y-10 px-6 pt-0 pb-10 sm:px-10">
            <div className="-mt-10 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-md ring-4 ring-white">
              <Award className="h-10 w-10 text-slate-600" />
            </div>
            <section>
              <h2 className="text-lg font-bold text-slate-900">What you get</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <span>A CV and cover letter prepared for every application you submit.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <span>One structured interview to help you prepare for what&apos;s actually asked.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <span>Direct messaging with our team, not an automated bot.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <span>Priority notice when new matching opportunities are added.</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">Why it matters</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Different countries and companies expect different things from a CV — structure,
                tone, what gets emphasized first — and getting that wrong is a quiet way for a
                genuinely strong candidate to be overlooked before anyone even reads the content. Our
                team, using AI to move faster without losing quality, knows the conventions
                institutions and employers in the German market actually expect, and builds each
                document around that — not a generic template reused for every country. The interview
                prep works the same way: German institutions and employers tend to ask differently
                than what you might expect from elsewhere, so preparing for the actual format matters
                more than general interview advice would.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">How it works</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Fill in your CV profile once — work history, education, skills — and it&apos;s reused
                every time you request a document for a specific match, so you&apos;re not re-entering
                the same information repeatedly. Request a CV for any match from your account; our
                team drafts it, you can ask for changes, and the final version is delivered as a real
                file you can download. Messaging stays open the whole time for anything else that
                comes up.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">What this isn&apos;t</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                You still submit your own applications — we prepare the materials, we don&apos;t submit
                anything on your behalf. Not legal or immigration advice; visa/residence-permit
                questions go to a licensed immigration lawyer.
              </p>
            </section>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
