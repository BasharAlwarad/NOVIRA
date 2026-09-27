'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { getCurrentUser, logout } from '@/lib/api/auth';
import { fetchMyMatches, NotSignedInError } from '@/lib/api/matches';
import type { MatchResult } from '@/lib/contracts/matches';
import {
  APPLICATION_HELP_PRICE_EUR,
  buildApplicationHelpLink,
  isApplicationHelpEnabled,
} from '@/lib/application-help';
import { SiteFooter } from '@/components/site-footer';
import { SiteNav } from '@/components/site-nav';

type PageState =
  | { status: 'loading' }
  | { status: 'not-signed-in' }
  | { status: 'error' }
  | { status: 'loaded'; matches: MatchResult[]; hasProfile: boolean };

const FIT_STYLES: Record<string, string> = {
  'Strong fit': 'bg-emerald-50 text-emerald-700',
  'Possible fit': 'bg-amber-50 text-amber-700',
  'Limited fit': 'bg-slate-100 text-slate-600',
};

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
      .then(([matches, user]) => {
        if (!cancelled) {
          setState({ status: 'loaded', matches, hasProfile: user?.hasProfile ?? false });
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
            {state.status === 'loaded' && (
              <span className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {state.matches.length} matching {state.matches.length === 1 ? 'opportunity' : 'opportunities'} found
              </span>
            )}
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

          {state.status === 'loaded' && state.hasProfile && (
            <>
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
