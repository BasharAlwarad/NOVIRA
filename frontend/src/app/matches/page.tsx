'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { logout } from '@/lib/api/auth';
import { fetchMyMatches, NotSignedInError } from '@/lib/api/matches';
import type { MatchResult } from '@/lib/contracts/matches';
import { SiteFooter } from '@/components/site-footer';
import { SiteNav } from '@/components/site-nav';

type PageState =
  | { status: 'loading' }
  | { status: 'not-signed-in' }
  | { status: 'error' }
  | { status: 'loaded'; matches: MatchResult[] };

const FIT_STYLES: Record<string, string> = {
  'Strong fit': 'bg-emerald-50 text-emerald-700',
  'Possible fit': 'bg-amber-50 text-amber-700',
  'Limited fit': 'bg-slate-100 text-slate-600',
};

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
    </div>
  );
}

export default function MatchesPage() {
  const [state, setState] = useState<PageState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    fetchMyMatches()
      .then((matches) => {
        if (!cancelled) {
          setState({ status: 'loaded', matches });
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
                href="/assessment/result"
                className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-emerald-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Back to my result
              </Link>
            </div>
          )}

          {state.status === 'error' && (
            <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              We couldn&apos;t load your matches right now. Please try again
              shortly.
            </p>
          )}

          {state.status === 'loaded' && state.matches.length === 0 && (
            <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No matching opportunities yet — check back soon as more real
              opportunities are added.
            </p>
          )}

          {state.status === 'loaded' &&
            state.matches.map((match) => (
              <MatchCard key={match.opportunityId} match={match} />
            ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
