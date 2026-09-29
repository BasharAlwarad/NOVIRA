'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { getCurrentUser, logout } from '@/lib/api/auth';
import { fetchMyMatches, NotSignedInError } from '@/lib/api/matches';
import type { MatchResult, StateCount } from '@/lib/contracts/matches';
import type { EffectiveTier } from '@/lib/contracts/account';
import {
  APPLICATION_HELP_PRICE_EUR,
  buildApplicationHelpLink,
  isApplicationHelpEnabled,
} from '@/lib/application-help';
import { TIER1_PRICE_EUR, getTier1PaymentLink, isTier1PurchaseEnabled } from '@/lib/tier-pricing';
import { SiteFooter } from '@/components/site-footer';
import { SiteNav } from '@/components/site-nav';

type PageState =
  | { status: 'loading' }
  | { status: 'not-signed-in' }
  | { status: 'error' }
  | {
      status: 'loaded';
      matches: MatchResult[];
      blurredCount: number;
      effectiveTier: EffectiveTier;
      hasProfile: boolean;
      stateBreakdown: StateCount[];
    };

// Five differently-shaped placeholder cards, mixed rather than repeated
// identically — see Monetization-Strategy.md §4.1's blur-then-unlock design:
// the backend only ever sends a bare count for anything beyond the one free
// match, never real data, so these have nothing to render but their own
// shape (varied bar widths/heights, varied factor-line counts).
const SKELETON_VARIANTS: { factorCount: number; titleWidth: string; hasLocation: boolean }[] = [
  { factorCount: 3, titleWidth: 'w-2/3', hasLocation: true },
  { factorCount: 2, titleWidth: 'w-1/2', hasLocation: false },
  { factorCount: 4, titleWidth: 'w-3/4', hasLocation: true },
  { factorCount: 1, titleWidth: 'w-5/12', hasLocation: true },
  { factorCount: 3, titleWidth: 'w-1/3', hasLocation: false },
];

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 1a4 4 0 00-4 4v2H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2h-1V5a4 4 0 00-4-4zm2 6V5a2 2 0 10-4 0v2h4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// Each blurred card carries its own explicit "locked" label rather than
// looking like a bare loading skeleton — found live 2026-09-29 that an
// animate-pulse-only placeholder with 33+ of them reads as "still loading",
// not "intentionally hidden," which is exactly the confusion a real unlock
// pattern (Glassdoor's blurred salary rows, LinkedIn's blurred viewer list)
// avoids by always pairing the blur with a lock icon + short label. Also
// itself a click target straight to checkout, same as those references.
function BlurredMatchCard({ variant }: { variant: number }) {
  const shape = SKELETON_VARIANTS[variant % SKELETON_VARIANTS.length];
  const enabled = isTier1PurchaseEnabled();

  const content = (
    <>
      <div aria-hidden className="pointer-events-none select-none opacity-50 blur-[2.5px]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="h-3 w-20 rounded-full bg-slate-200" />
            <div className={`h-4 ${shape.titleWidth} rounded-full bg-slate-200`} />
            {shape.hasLocation && <div className="h-3 w-1/3 rounded-full bg-slate-100" />}
          </div>
          <div className="h-6 w-20 shrink-0 rounded-full bg-slate-100" />
        </div>
        <div className="mt-4 space-y-2">
          {Array.from({ length: shape.factorCount }).map((_, index) => (
            <div
              key={index}
              className="h-3 rounded-full bg-slate-100"
              style={{ width: `${70 - index * 12}%` }}
            />
          ))}
        </div>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-white/60">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/80 text-white">
          <LockIcon className="h-4 w-4" />
        </span>
        <span className="text-xs font-semibold text-slate-700">Unlock to see this match</span>
      </div>
    </>
  );

  const className =
    'group relative block overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-emerald-300';

  if (!enabled) {
    return <div className={className}>{content}</div>;
  }

  return (
    <a href={getTier1PaymentLink()} className={className}>
      {content}
    </a>
  );
}

// Placed at the TOP of the results, not after them — found live 2026-09-29
// that with 30+ blurred cards below it, a bottom-of-list banner required
// scrolling past all of them to ever see it. Same placement as the real
// references this was modeled on (Glassdoor's "Unlock salaries" bar,
// LinkedIn's "See who's viewed your profile" banner) — the offer to unlock
// is the first thing seen, not a reward for scrolling to the end.
function UnlockBanner({ blurredCount }: { blurredCount: number }) {
  if (!isTier1PurchaseEnabled()) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <LockIcon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-emerald-900">
            {blurredCount > 0
              ? `Unlock all ${blurredCount + 1} matches`
              : 'Unlock full access to your matches'}
          </p>
          <p className="mt-1 text-sm leading-6 text-emerald-800">
            €{TIER1_PRICE_EUR} unlocks every matching opportunity, plus a quick human review of
            your profile.
          </p>
          <a
            href={getTier1PaymentLink()}
            className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-emerald-500 px-5 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            Unlock — €{TIER1_PRICE_EUR}
          </a>
        </div>
      </div>
    </div>
  );
}

// Client-only: Leaflet touches window/document, which breaks under Next's
// server render even inside an already-'use client' page — the standard
// fix is a dynamic import with ssr:false. Superseded the earlier flat
// badge-list design (2026-09-29) after the founder asked for a real map.
const GermanyMatchesMap = dynamic(
  () => import('@/components/germany-matches-map').then((mod) => mod.GermanyMatchesMap),
  { ssr: false, loading: () => <div className="h-80 animate-pulse rounded-3xl bg-slate-100" /> }
);

const FIT_STYLES: Record<string, string> = {
  'Strong fit': 'bg-emerald-50 text-emerald-700',
  'Possible fit': 'bg-amber-50 text-amber-700',
  'Limited fit': 'bg-slate-100 text-slate-600',
};

// yyyy-MM-dd strings from the backend's DateOnly fields — timeZone: 'UTC'
// pins the parsed date to the date it actually names, not whatever the
// viewer's local offset happens to shift midnight UTC to (a real off-by-one-
// day risk otherwise, e.g. a US-evening viewer seeing the day before).
function formatMonthYear(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatFullDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// Real Opportunity fields (tuition/compensation/dates/description/source),
// gracefully omitted rather than shown as an empty placeholder wherever
// real data doesn't have them (especially common on Bundesagentur-synced
// Ausbildung rows) — same discipline as /account's ProfileSection/
// VerifiedSection. Built 2026-09-29 so the one free match actually gives
// enough concrete detail to be worth unlocking the rest for.
function buildMatchDetails(match: MatchResult): string[] {
  const details: string[] = [];

  if (match.path === 'Ausbildung' && match.monthlyCompensationEur !== null) {
    details.push(`€${match.monthlyCompensationEur}/month`);
  }

  if (match.path === 'University') {
    if (match.tuitionFeeEur === 0) {
      details.push('Tuition-free');
    } else if (match.tuitionFeeEur !== null) {
      details.push(`Tuition: €${match.tuitionFeeEur}`);
    }
  }

  if (match.startDate) {
    details.push(`Starts ${formatMonthYear(match.startDate)}`);
  }

  if (match.applicationDeadline) {
    details.push(`Apply by ${formatFullDate(match.applicationDeadline)}`);
  }

  return details;
}

// The paid "Get help applying" offer (built 2026-09-12) — see
// Monetization-Strategy.md §4/§4.4. Deliberately collapsed behind a plain-
// text toggle rather than a modal (no modal component exists elsewhere in
// this codebase; an inline expand/collapse matches the existing pattern
// used for e.g. the document-correction banner on /account). Free match
// info (title/provider/location/fit) is never touched by this — the offer
// is for hands-on help with a specific application, not access to the
// match itself. The "apply directly, this is optional" line right in the
// expanded copy is deliberate, not boilerplate: hiding that a free path
// exists would be exactly the kind of dark pattern Plan.md §5's
// "radical transparency" positioning exists to rule out.
function ApplicationHelpOffer({ match }: { match: MatchResult }) {
  const [expanded, setExpanded] = useState(false);

  if (!isApplicationHelpEnabled()) {
    return null;
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-4 border-t border-slate-100 pt-4 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
      >
        Get help applying to this →
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-2xl bg-emerald-50/60 p-4">
      <p className="text-sm font-semibold text-emerald-900">
        What&apos;s included (€{APPLICATION_HELP_PRICE_EUR}, one-time)
      </p>
      <ul className="mt-2 space-y-1 text-sm text-emerald-800">
        <li>• We check your documents against this program&apos;s specific requirements</li>
        <li>• We review what you&apos;re about to submit, before you submit it</li>
        <li>• Feedback on your CV or motivation letter, if you have one</li>
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <a
          href={buildApplicationHelpLink(match.opportunityId)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-500 px-5 text-sm font-semibold text-white transition hover:bg-emerald-600"
        >
          Continue — €{APPLICATION_HELP_PRICE_EUR}
        </a>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Not now
        </button>
      </div>
      {/* A single interpolated string, not mixed JSX text nodes split
          across lines — the latter hits a real JSX whitespace-collapsing
          gotcha where React trims the leading space off a text segment
          that starts a new physical line right after an expression,
          silently swallowing the space between {match.provider} and the
          word that follows (found live during verification: rendered as
          "GmbHon" instead of "GmbH on"). */}
      <p className="mt-2 text-xs text-slate-500">
        {`You can also apply directly with ${match.provider} on your own — this is optional, hands-on help if you'd like a second pair of eyes.`}
      </p>
    </div>
  );
}

function MatchCard({ match }: { match: MatchResult }) {
  const details = buildMatchDetails(match);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {match.path}
          </p>
          <h2 className="mt-1 text-base font-semibold text-slate-950">
            {match.title}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {match.provider}
            {match.location ? ` — ${match.location}` : ''}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${FIT_STYLES[match.fitLabel] ?? 'bg-slate-100 text-slate-600'}`}
        >
          {match.fitLabel}
        </span>
      </div>

      {details.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {details.map((detail) => (
            <span
              key={detail}
              className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
            >
              {detail}
            </span>
          ))}
        </div>
      )}

      {match.description && (
        <p className="mt-3 text-sm leading-6 text-slate-600">{match.description}</p>
      )}

      {match.factors.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {match.factors.map((factor) => (
            <li
              key={factor.label}
              className={`text-sm ${factor.positive ? 'text-emerald-700' : 'text-slate-500'}`}
            >
              {factor.positive ? '✓ ' : '– '}
              {factor.label}
            </li>
          ))}
        </ul>
      )}

      {match.sourceUrl && (
        <a
          href={match.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          View official page →
        </a>
      )}

      <ApplicationHelpOffer match={match} />
    </div>
  );
}

// Split by path (built 2026-09-09) — was one flat list across both real
// paths; sectioning makes each path's own count/empty-state visible
// instead of a single blended total. emptyMessage is shown only when the
// section has real (if currently empty) data behind it — null renders a
// bare, unexplained "0" instead, for the Work section below, which has no
// backing data or matching logic at all (Opportunity's own path type
// doesn't even have an Employment value) — deliberately no messaging about
// scope or timing here, just the fact of the count.
function MatchSection({
  matches,
  emptyMessage,
}: {
  matches: MatchResult[];
  emptyMessage: string | null;
}) {
  return (
    <div className="space-y-4">
      {matches.length === 0 && (
        <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          {emptyMessage ?? '0 matching opportunities found.'}
        </p>
      )}
      {matches.map((match) => (
        <MatchCard key={match.opportunityId} match={match} />
      ))}
    </div>
  );
}

type MatchTab = 'Ausbildung' | 'University' | 'Work';
const MATCH_TABS: MatchTab[] = ['Ausbildung', 'University', 'Work'];

// Tab navigation between the three sections (added 2026-09-09, on top of
// the same-day sectioning above) — with a real Ausbildung batch running
// 25-30+ matches deep, showing all three sections stacked made for a very
// long scroll; tabs let the user jump straight to the one they care about
// instead. Backed by a `?section=` URL search param, not local state, so a
// link straight to e.g. "University matches" is bookmarkable/shareable —
// same pattern as the admin opportunities page's own status filter tabs.
function SectionTabs({ counts }: { counts: Record<MatchTab, number> }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('section') as MatchTab | null) ?? 'Ausbildung';

  return (
    <div className="flex gap-2">
      {MATCH_TABS.map((tab) => {
        const active = tab === activeTab;
        const href = tab === 'Ausbildung' ? pathname : `${pathname}?section=${tab}`;
        return (
          <Link
            key={tab}
            href={href}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              active ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab} ({counts[tab]})
          </Link>
        );
      })}
    </div>
  );
}

function MatchesPageContent() {
  const [state, setState] = useState<PageState>({ status: 'loading' });
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('section') as MatchTab | null) ?? 'Ausbildung';

  useEffect(() => {
    let cancelled = false;

    // hasProfile is fetched alongside the matches themselves so the empty
    // state (0 matches) can tell apart two very different situations: a
    // real profile that genuinely has no current fit ("check back soon" is
    // honest advice there) vs. an account with no self-reported profile at
    // all — e.g. one that signed up and went straight to uploading
    // documents without the assessment, a real path since the 2026-08-28
    // "sign up from anywhere" reframe (see CLAUDE.md's Sign-up UX entry).
    // For that second case, no amount of new opportunity data will ever
    // produce a match — OccupationField (the primary hard filter) has no
    // Verified* equivalent — so "check back soon" is actively misleading;
    // only completing the assessment fixes it. Found live 2026-08-30 on a
    // real account in exactly this state.
    Promise.all([fetchMyMatches(), getCurrentUser()])
      .then(([matchesResponse, user]) => {
        if (!cancelled) {
          setState({
            status: 'loaded',
            matches: matchesResponse.matches,
            blurredCount: matchesResponse.blurredCount,
            effectiveTier: matchesResponse.effectiveTier,
            hasProfile: user?.hasProfile ?? false,
            stateBreakdown: matchesResponse.stateBreakdown,
          });
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setState({
          status: error instanceof NotSignedInError ? 'not-signed-in' : 'error',
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setState({ status: 'not-signed-in' });
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteNav />
      <section className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">
              Your matches
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl">
              Matching opportunities
            </h1>
            {state.status === 'loaded' && (() => {
              const total = state.matches.length + state.blurredCount;
              return (
                <span className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {total} matching {total === 1 ? 'opportunity' : 'opportunities'} found
                </span>
              );
            })()}
          </div>
          {state.status === 'loaded' && (
            <button
              type="button"
              onClick={handleLogout}
              className="mt-1 text-xs font-medium text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
            >
              Sign out
            </button>
          )}
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Matched against your profile — self-reported answers, plus
          anything confirmed from your approved documents. A licensed
          advisor or our own review can confirm exactly what applies to your
          situation.
        </p>

        <div className="mt-8 space-y-4">
          {state.status === 'loading' && (
            <p className="text-sm text-slate-500">Loading your matches…</p>
          )}

          {state.status === 'not-signed-in' && (
            <div className="rounded-4xl border border-slate-200 bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              <p className="text-sm text-slate-600">
                You&apos;re not signed in, or your sign-in link has expired.
              </p>
              <Link
                href="/signin"
                className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-emerald-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Sign in
              </Link>
            </div>
          )}

          {state.status === 'error' && (
            <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              We couldn&apos;t load your matches right now. Please try again
              shortly.
            </p>
          )}

          {state.status === 'loaded' && state.matches.length === 0 && !state.hasProfile && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5">
              <p className="text-sm font-semibold text-amber-900">
                We don&apos;t have your profile yet
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                Matching runs against your assessment answers (occupation
                field, education, language level, and more) — your account
                doesn&apos;t have any yet, so there&apos;s nothing to match
                against regardless of how many opportunities exist. Take the
                free assessment to see real matches.
              </p>
              <Link
                href="/assessment"
                className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-amber-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
              >
                Take the assessment
              </Link>
            </div>
          )}

          {/* Free tier gets one real match plus a blurred count (never a
              per-path breakdown, since the backend never sends one — see
              MatchesResponse's comment) — so the path tabs below, which
              depend on knowing each match's path, only make sense once
              everything is unlocked. Deliberately a flat list here instead. */}
          {state.status === 'loaded' && state.hasProfile && state.effectiveTier === 'Free' && (
            <>
              {state.matches.length === 0 && state.blurredCount === 0 ? (
                <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No matching opportunities yet — check back soon as more real opportunities are
                  added.
                </p>
              ) : (
                <>
                  <UnlockBanner blurredCount={state.blurredCount} />
                  <div className="mt-4">
                    <GermanyMatchesMap stateBreakdown={state.stateBreakdown} />
                  </div>
                  <div className="mt-6 space-y-4">
                    {state.matches.map((match) => (
                      <MatchCard key={match.opportunityId} match={match} />
                    ))}
                    {Array.from({ length: state.blurredCount }).map((_, index) => (
                      <BlurredMatchCard key={index} variant={index} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {state.status === 'loaded' && state.hasProfile && state.effectiveTier !== 'Free' && (
            <>
              <div className="mb-6">
                <GermanyMatchesMap stateBreakdown={state.stateBreakdown} />
              </div>

              <SectionTabs
                counts={{
                  Ausbildung: state.matches.filter((match) => match.path === 'Ausbildung').length,
                  University: state.matches.filter((match) => match.path === 'University').length,
                  Work: 0,
                }}
              />

              <div className="mt-6">
                {activeTab === 'Ausbildung' && (
                  <MatchSection
                    matches={state.matches.filter((match) => match.path === 'Ausbildung')}
                    emptyMessage="No matching Ausbildung opportunities yet — check back soon as more real opportunities are added."
                  />
                )}
                {activeTab === 'University' && (
                  <MatchSection
                    matches={state.matches.filter((match) => match.path === 'University')}
                    emptyMessage="No matching university opportunities yet — check back soon as more real opportunities are added."
                  />
                )}
                {activeTab === 'Work' && <MatchSection matches={[]} emptyMessage={null} />}
              </div>
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

// useSearchParams() requires a <Suspense> boundary or the production build
// fails to prerender the route — same fix already applied elsewhere
// (/auth/verify/page.tsx, the admin opportunities path pages).
export default function MatchesPage() {
  return (
    <Suspense fallback={null}>
      <MatchesPageContent />
    </Suspense>
  );
}
