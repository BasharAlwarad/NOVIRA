'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Award, CheckCircle2 } from 'lucide-react';
import { SiteFooter } from '@/components/site-footer';
import { SiteNav } from '@/components/site-nav';
import { fetchMyAccount } from '@/lib/api/account';
import { TierBadge } from '@/components/tier-badge';
import { getTier2PaymentLink, getTier2PriceEur, isTier2PurchaseEnabled } from '@/lib/tier-pricing';
import type { EffectiveTier } from '@/lib/contracts/account';

// Round 6: this page used to render a static price/link (TIER2_PRICE_EUR,
// getTier2PaymentLink() with no args) since it was a plain, session-unaware
// public page. Tier2's new carry-up discount (€120 instead of €150 for a
// user who already paid Tier1) needs to know the viewer's effectiveTier, so
// this block self-fetches the account the same way Tier3RequestCard
// already does (tier3-request.tsx) rather than making the whole page a
// server-side, session-gated route — a signed-out or not-yet-loaded visitor
// just sees the full, undiscounted price/link, never a broken state.
// `variant` added 2026-11-09 so this can also render as the page's bottom
// CTA (matching /plans/tier-3's existing repeated-CTA pattern) without its
// price text staying white-on-white against that section's light
// background — 'hero' (default) keeps the original dark-hero styling.
function PriceAndUnlockButton({ variant = 'hero' }: { variant?: 'hero' | 'footer' }) {
  const [effectiveTier, setEffectiveTier] = useState<EffectiveTier>('Free');

  useEffect(() => {
    fetchMyAccount()
      .then((account) => setEffectiveTier(account.effectiveTier))
      .catch(() => {
        // Signed out, or any fetch failure — stays at the 'Free' default,
        // which is exactly the correct (undiscounted) price/link for an
        // anonymous visitor anyway.
      });
  }, []);

  const priceEur = getTier2PriceEur(effectiveTier);

  return (
    <>
      <p className={`mt-2 text-xl font-semibold ${variant === 'hero' ? 'text-slate-100' : 'text-slate-600'}`}>
        €{priceEur}
      </p>
      <div className="mt-6">
        {isTier2PurchaseEnabled() ? (
          <a
            href={getTier2PaymentLink(effectiveTier)}
            className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-500 px-6 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            Unlock — €{priceEur}
          </a>
        ) : (
          <p className="text-sm text-slate-500">
            Payment isn&apos;t set up yet for this account — contact us via Messages.
          </p>
        )}
      </div>
    </>
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
            <PriceAndUnlockButton />
          </div>

          <div className="space-y-10 px-6 pt-0 pb-10 sm:px-10">
            <TierBadge icon={Award} variant="silver" size="lg" />
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

            {/* Repeats the hero's CTA down here (found live 2026-11-09,
              matching /plans/tier-3's existing pattern) — same reasoning as
              /plans/tier-1's own copy of this block. */}
            <div className="border-t border-slate-100 pt-8 text-center">
              <p className="text-sm text-slate-600">Ready to get started?</p>
              <PriceAndUnlockButton variant="footer" />
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
