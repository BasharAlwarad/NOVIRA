'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Hero } from '@/components/hero';
import { SiteFooter } from '@/components/site-footer';
import { SiteNav } from '@/components/site-nav';
import {
  TierCard,
  BRONZE_BULLETS_TAIL,
  SILVER_BULLETS,
  GOLD_BULLETS,
  FREE_BULLETS,
} from '@/components/tier-card';
import { getCurrentUser } from '@/lib/api/auth';
import { TIER1_PRICE_EUR, TIER2_PRICE_EUR, TIER3_UPFRONT_EUR, TIER3_SUCCESS_FEE_EUR } from '@/lib/tier-pricing';

// Added 2026-11-01 — the founder noticed the homepage was thin right after
// the cards, straight into the footer. Describes the real flow step by
// step rather than adding a stats/testimonial section, which would need
// real numbers or real quotes NOVIRA doesn't have yet (same anti-
// fabrication discipline OpportunityCounts.tsx follows — no invented
// numbers). Checked against novira-legal-check before writing: the
// eligibility-requirement breakdown in step 2 is scoped to university and
// Ausbildung only (it doesn't cover employment — see
// Matching-Algorithm-Study.md §7), so this copy is careful to attach that
// breakdown to those two paths specifically rather than implying it's the
// same for all three; step 4 mirrors Tier 3's own established wording
// ("help...complete and submit," under a signed agreement — never "on your
// behalf," see tier3-request.tsx and Legal.md §3).
const HOW_IT_WORKS_STEPS = [
  {
    title: 'Take the assessment',
    description:
      'Answer questions about your education, experience, and goals — no signup required. Takes about 5 minutes.',
  },
  {
    title: 'Get your verdict',
    description:
      "A rules-based verdict on which path — university, Ausbildung, or employment — fits your profile best, plus a requirement-by-requirement breakdown for university and Ausbildung: what's already met, what you can still work on, and what would need a different path.",
  },
  {
    title: 'See real matches',
    description:
      "Sign up free to see one real opportunity, or unlock the full list with Bronze. Every listing is reviewed by a person before it's approved and shown.",
  },
  {
    title: 'Get help applying',
    description:
      'Silver adds a CV and cover letter for each application, plus direct messaging with our team. Gold adds full support completing and submitting your application, under a signed agreement.',
  },
];

// Rewritten 2026-10-04 (point 1 of the UI/UX hardening pass) — the previous
// copy here was generic "Study/Work/Information" placeholder text written
// before any of the real product existed, and hadn't been touched since.
// Now describes the actual three-tier funnel, and doubles as the "what do
// I get at each level" explainer the nav's tier badge links to (point 2) —
// one place for this, not two.
//
// Default-to-assessment gate (added 2026-11-01): a visitor with no saved
// profile (not signed in, or signed in but never completed the
// assessment — same `hasProfile` flag the nav already uses to decide
// whether to show its own "Assessment" link) gets sent straight to
// /assessment instead of seeing this marketing page — the founder's own
// call: someone who hasn't taken the questionnaire yet should land on it
// by default, not on a sales pitch for tiers they have no verdict to act
// on yet. Deliberately keyed off the server-confirmed `hasProfile` flag,
// not localStorage — an anonymous visitor who finished the wizard but
// never signed up still gets redirected back to it on a later visit; a
// per-browser localStorage check would be a weaker, device-specific
// signal and was explicitly not chosen. Fails open (shows the homepage
// rather than blocking) if the /auth/me check itself errors, so a
// transient network hiccup never traps a visitor behind a blank page.
export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((user) => {
        if (cancelled) return;
        if (user?.hasProfile) {
          setReady(true);
        } else {
          router.replace('/assessment');
        }
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main
      id="top"
      className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_40%),linear-gradient(180deg,#0f172a_0%,#111827_50%,#f8fafc_50%,#f8fafc_100%)] text-slate-900"
    >
      <SiteNav />
      {ready && (
        <section className="mx-auto flex w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <Hero />

          <section
            id="services"
            className="mt-6 grid gap-4 rounded-4xl border border-slate-200 bg-white px-6 py-6 shadow-xl shadow-slate-200/60 sm:grid-cols-2 lg:grid-cols-4"
          >
            {/* Round 18 dropped each card's own heading (duplicated the header
                band/bullets, the single biggest height cost). Round 21+
                (2026-10-31) moved the card markup itself into the shared
                TierCard component (tier-card.tsx) — this and the compact
                upsell cards on /matches and /account (tier-upgrade-options.tsx,
                tier3-request.tsx) now render the same component, so they can't
                drift apart the way three hand-maintained copies eventually
                did. */}
            <TierCard variant="free" bullets={FREE_BULLETS} href="/assessment" ctaLabel="Start questionnaire" />
            <TierCard
              variant="bronze"
              price={`€${TIER1_PRICE_EUR}`}
              bullets={['Unlock every match', ...BRONZE_BULLETS_TAIL]}
              href="/plans/tier-1"
            />
            <TierCard variant="silver" price={`€${TIER2_PRICE_EUR}`} bullets={SILVER_BULLETS} href="/plans/tier-2" />
            {/* Shown as two figures, not one combined total — this is
                genuinely two separate payments (an upfront fee, then a success
                fee only if the application succeeds), and collapsing that into
                a single "€1,500" price would read as one flat charge upfront,
                which isn't honest about how it actually works. */}
            <TierCard
              variant="gold"
              price={`€${TIER3_UPFRONT_EUR} + €${TIER3_SUCCESS_FEE_EUR}`}
              bullets={GOLD_BULLETS}
              href="/plans/tier-3"
            />
          </section>

          <section className="mt-12">
            <h2 className="text-center text-2xl font-semibold text-slate-950 sm:text-3xl">How it works</h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-600">
              From your first answer to getting help with a real application — the whole flow in four
              steps.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS_STEPS.map((step, index) => (
                <div key={step.title} className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600">{step.description}</p>
                </div>
              ))}
            </div>
          </section>
        </section>
      )}
      <SiteFooter />
    </main>
  );
}
