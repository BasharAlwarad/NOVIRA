'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AdminUnauthorizedError,
  createOpportunity,
  generateUniversity,
  listOpportunities,
  syncAusbildung,
  updateOpportunityStatus,
} from '@/lib/api/opportunities';
import type { CreateOpportunityRequest, Opportunity, OpportunityPath } from '@/lib/contracts/opportunities';
import { useAdminKey } from '@/hooks/useAdminKey';
import {
  AddOpportunityForm,
  computeStatusCounts,
  filterByStatus,
  OpportunityRow,
  PathTabs,
  StatusFilterTabs,
  type StatusFilter,
} from './_shared';

// One page per OpportunityPath (built 2026-08-30, replacing the old single
// page that stacked both paths' full lists on top of each other) — the
// founder wanted real navigation between Ausbildung/University plus a way
// to filter by review status instead of scrolling through everything.
// `path` is the only thing that varies between the two route files that
// render this; the Generate button's behavior branches on it internally
// since there are only ever two concrete cases.
function OpportunityPathViewContent({ path }: { path: OpportunityPath }) {
  const { adminKey, clearAdminKey } = useAdminKey();
  const [opportunities, setOpportunities] = useState<Opportunity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const statusFilter = (searchParams.get('status') as StatusFilter | null) ?? 'Pending';

  const loadOpportunities = useCallback(async () => {
    setError(null);
    try {
      const data = await listOpportunities(adminKey);
      setOpportunities(data);
    } catch (err) {
      if (err instanceof AdminUnauthorizedError) {
        clearAdminKey();
      } else {
        setError('Failed to load opportunities.');
      }
    }
  }, [adminKey, clearAdminKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOpportunities();
  }, [loadOpportunities]);

  const handleDecide = async (id: string, status: 'Approved' | 'Denied') => {
    try {
      const updated = await updateOpportunityStatus(adminKey, id, status);
      setOpportunities(
        (current) => current?.map((item) => (item.id === updated.id ? updated : item)) ?? null
      );
    } catch (err) {
      if (err instanceof AdminUnauthorizedError) {
        clearAdminKey();
      } else {
        setError('Failed to update that opportunity.');
      }
    }
  };

  const handleGenerate = async () => {
    if (generating) return;

    setGenerating(true);
    setGenerateMessage(null);
    try {
      if (path === 'Ausbildung') {
        const { added } = await syncAusbildung(adminKey);
        setGenerateMessage(
          added > 0
            ? `Added ${added} new listing${added === 1 ? '' : 's'} as Pending.`
            : 'No new listings found — everything currently live was already synced.'
        );
      } else {
        const { added, fieldsResearched, fieldsSkipped, estimatedCostUsd } = await generateUniversity(adminKey);
        const costLine = `Researched ${fieldsResearched} field${fieldsResearched === 1 ? '' : 's'}${
          fieldsSkipped > 0 ? ` (${fieldsSkipped} skipped — already well covered)` : ''
        }, ~$${estimatedCostUsd.toFixed(2)} spent.`;
        setGenerateMessage(
          added > 0
            ? `Added ${added} new program${added === 1 ? '' : 's'} as Pending — verify the source link before approving. ${costLine}`
            : `No new, currently-open programs found on this run — everything found was already in the list, or nothing genuinely relevant turned up. ${costLine}`
        );
      }
      await loadOpportunities();
    } catch (err) {
      if (err instanceof AdminUnauthorizedError) {
        clearAdminKey();
      } else {
        setGenerateMessage('Failed to generate — try again.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleAddOpportunity = async (request: CreateOpportunityRequest) => {
    try {
      await createOpportunity(adminKey, request);
      await loadOpportunities();
    } catch (err) {
      if (err instanceof AdminUnauthorizedError) {
        clearAdminKey();
      }
      throw err;
    }
  };

  const pathOpportunities = opportunities?.filter((o) => o.path === path) ?? [];
  const counts = computeStatusCounts(pathOpportunities);
  const visible = opportunities === null ? [] : filterByStatus(pathOpportunities, statusFilter);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-950">{path} opportunities</h1>
          <PathTabs />
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {counts.Pending} pending, {counts.Approved} approved, {counts.Denied} denied.
        </p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <StatusFilterTabs counts={counts} />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            title={
              path === 'University'
                ? 'Searches daad.de, study-in-germany.de, and hochschulkompass.de only — see Matching-Algorithm-Study.md §8 for the source-credibility design.'
                : undefined
            }
            className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? 'Generating…' : `Generate ${path}`}
          </button>
        </div>
        {generateMessage && <p className="mt-2 text-xs text-slate-500">{generateMessage}</p>}

        <AddOpportunityForm path={path} onSubmit={handleAddOpportunity} />

        {opportunities === null ? (
          <p className="mt-8 text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="mt-6 space-y-4">
            {visible.map((opportunity) => (
              <OpportunityRow key={opportunity.id} opportunity={opportunity} onDecide={handleDecide} />
            ))}
            {visible.length === 0 && (
              <p className="text-sm text-slate-500">
                Nothing {statusFilter === 'All' ? '' : statusFilter.toLowerCase()} here.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

// useSearchParams() requires a <Suspense> boundary or the production build
// fails to prerender the route — same fix already applied to
// /auth/verify/page.tsx for the same reason.
export function OpportunityPathView({ path }: { path: OpportunityPath }) {
  return (
    <Suspense fallback={null}>
      <OpportunityPathViewContent path={path} />
    </Suspense>
  );
}
