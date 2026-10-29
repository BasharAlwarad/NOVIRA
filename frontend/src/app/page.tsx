import { Award, Crown, Medal, Sparkles } from 'lucide-react';
import { Hero } from '@/components/hero';
import { SiteFooter } from '@/components/site-footer';
import { SiteNav } from '@/components/site-nav';
import { TierBadge } from '@/components/tier-badge';
import { TIER1_PRICE_EUR, TIER2_PRICE_EUR, TIER3_UPFRONT_EUR, TIER3_SUCCESS_FEE_EUR } from '@/lib/tier-pricing';

// Rewritten 2026-10-04 (point 1 of the UI/UX hardening pass) — the previous
// copy here was generic "Study/Work/Information" placeholder text written
// before any of the real product existed, and hadn't been touched since.
// Now describes the actual three-tier funnel, and doubles as the "what do
// I get at each level" explainer the nav's tier badge links to (point 2) —
// one place for this, not two.
export default async function Home() {
  return (
    <main
      id="top"
      className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_40%),linear-gradient(180deg,#0f172a_0%,#111827_50%,#f8fafc_50%,#f8fafc_100%)] text-slate-900"
    >
      <SiteNav />
      <section className="mx-auto flex w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <Hero />

        <section
          id="services"
          className="mt-6 grid gap-4 rounded-4xl border border-slate-200 bg-white px-6 py-6 shadow-xl shadow-slate-200/60 sm:grid-cols-2 lg:grid-cols-4"
        >
          {/* Round 7: matches the gradient-header + medallion-badge +
              star-row shape used everywhere else in the app (/matches'
              compact cards, /account's current-plan banner, /plans/tier-X)
              instead of the old flat bg-slate-50 boxes — same copy, just a
              consistent shell. Centered body text mirrors /account's
              CurrentPlanBanner shape (badge + heading + one paragraph, no
              bullets/CTA) rather than the compact upsell cards' left-aligned
              bullet-list shape, since these are single-paragraph explainer
              cards, not feature lists. */}
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="bg-linear-to-br from-slate-300 to-slate-200 px-5 pt-5 pb-9">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                Free
              </p>
            </div>
            <div className="flex flex-col items-center px-5 pb-5">
              <TierBadge icon={Sparkles} iconColorClass="text-slate-500" starCount={0} />
              <h2 className="mt-2 text-center text-xl font-bold text-slate-900">
                Find your pathway
              </h2>
              <p className="mt-2 text-center text-sm leading-6 text-slate-600">
                A free assessment gives you a personalized verdict — university,
                Ausbildung, or work — plus one real matching opportunity, no
                signup required.
              </p>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="bg-linear-to-br from-amber-800 to-amber-700 px-5 pt-5 pb-9">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
                Tier 1 — €{TIER1_PRICE_EUR}
              </p>
            </div>
            <div className="flex flex-col items-center px-5 pb-5">
              <TierBadge icon={Medal} iconColorClass="text-amber-800" starCount={1} />
              <h2 className="mt-2 text-center text-xl font-bold text-slate-900">
                Unlock every match
              </h2>
              <p className="mt-2 text-center text-sm leading-6 text-slate-600">
                See every real opportunity that fits your profile, with a
                human review of your eligibility — not just the one free
                match.
              </p>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="bg-linear-to-br from-slate-600 to-slate-500 px-5 pt-5 pb-9">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-100">
                Tier 2 — €{TIER2_PRICE_EUR}
              </p>
            </div>
            <div className="flex flex-col items-center px-5 pb-5">
              <TierBadge icon={Award} iconColorClass="text-slate-600" starCount={2} />
              <h2 className="mt-2 text-center text-xl font-bold text-slate-900">
                Get application support
              </h2>
              <p className="mt-2 text-center text-sm leading-6 text-slate-600">
                An AI-drafted CV and cover letter for any match, real-time chat
                with our team, and a way to track what you&apos;ve applied to.
              </p>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="bg-linear-to-br from-yellow-600 to-yellow-500 px-5 pt-5 pb-9">
              {/* Shown as two figures, not one combined total — this is
                  genuinely two separate payments (an upfront fee, then a
                  success fee only if the application succeeds), and
                  collapsing that into a single "€1,500" price would read as
                  one flat charge upfront, which isn't honest about how it
                  actually works. */}
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-100">
                Tier 3 — €{TIER3_UPFRONT_EUR} + €{TIER3_SUCCESS_FEE_EUR}
              </p>
            </div>
            <div className="flex flex-col items-center px-5 pb-5">
              <TierBadge icon={Crown} iconColorClass="text-yellow-600" starCount={3} />
              <h2 className="mt-2 text-center text-xl font-bold text-slate-900">
                Get full-service help
              </h2>
              <p className="mt-2 text-center text-sm leading-6 text-slate-600">
                After a real conversation with our team, we help you complete
                and submit your application under a signed agreement —
                €{TIER3_UPFRONT_EUR} upfront, the remaining €{TIER3_SUCCESS_FEE_EUR} only if it
                succeeds.
              </p>
            </div>
          </div>
        </section>
      </section>
      <SiteFooter />
    </main>
  );
}
