'use client';

import { useEffect, useState } from 'react';
import { fetchOpportunityCounts } from '@/lib/api/opportunity-counts';
import type { OpportunityCountsResponse } from '@/lib/contracts/opportunity-counts';
import type { ProfileSnapshot } from '@/lib/contracts/leads';

interface OpportunityCountsProps {
  profile: ProfileSnapshot;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; counts: OpportunityCountsResponse };

/**
 * Real matching-opportunity counts, computed server-side against the live
 * (admin-approved) opportunities database via MatchingService — replaces
 * the old PlaceholderOpportunityCounts mock. Counts only, no names/details:
 * the staged reveal from Plan.md §4 gates opportunity details behind
 * account signup, which doesn't exist yet.
 *
 * No "Job openings" card — jobs/employment matching is out of scope
 * everywhere else in the app (see CLAUDE.md), so showing a count here would
 * be the one place implying it exists.
 */
export function OpportunityCounts({ profile }: OpportunityCountsProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    fetchOpportunityCounts(profile)
      .then((counts) => {
        if (!cancelled) {
          setState({ status: 'loaded', counts });
        }
      })
      .catch(() => {
        // Rate-limited or any other failure — same inline fallback either
        // way, this section just quietly doesn't show a count.
        if (!cancelled) {
          setState({ status: 'error' });
        }
      });

    return () => {
      cancelled = true;
    };
    // profile is derived fresh from localStorage answers on every render of
    // the parent page, not user-editable in place — safe to fetch once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-900">
        Matching opportunities
      </p>

      {state.status === 'loading' && (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center"
            >
              <div className="mx-auto h-8 w-10 rounded bg-slate-200" />
              <div className="mx-auto mt-2 h-3 w-20 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          We couldn&apos;t load matching opportunities right now. This
          doesn&apos;t affect your saved result.
        </p>
      )}

      {state.status === 'loaded' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-2xl font-semibold text-slate-900">
                {state.counts.ausbildungCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Ausbildung positions
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-2xl font-semibold text-slate-900">
                {state.counts.universityCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                University programs
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Matched against your self-reported answers — not yet verified by
            us. Sign up to see the actual opportunities.
          </p>
        </>
      )}
    </div>
  );
}
