'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminUnauthorizedError, listTier3Cases, updateTier3Case } from '@/lib/api/admin-tier3';
import type { AdminTier3Case, Tier3CaseStatus } from '@/lib/contracts/tier3';
import { useAdminKey } from '@/hooks/useAdminKey';

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const STATUS_OPTIONS: Tier3CaseStatus[] = [
  'Requested',
  'ConsultationScheduled',
  'AgreementSigned',
  'ActiveSearch',
  'ApplicationSubmitted',
  'Secured',
  'Complete',
  'Refunded',
];

const STATUS_STYLES: Record<Tier3CaseStatus, string> = {
  Requested: 'bg-amber-50 text-amber-700',
  ConsultationScheduled: 'bg-sky-50 text-sky-700',
  AgreementSigned: 'bg-sky-50 text-sky-700',
  ActiveSearch: 'bg-indigo-50 text-indigo-700',
  ApplicationSubmitted: 'bg-indigo-50 text-indigo-700',
  Secured: 'bg-emerald-50 text-emerald-700',
  Complete: 'bg-emerald-50 text-emerald-700',
  Refunded: 'bg-slate-100 text-slate-600',
};

function humanizeStatus(status: Tier3CaseStatus): string {
  return status.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function CaseCard({
  tier3Case,
  onUpdated,
}: {
  tier3Case: AdminTier3Case;
  onUpdated: (updated: AdminTier3Case) => void;
}) {
  const { adminKey, clearAdminKey } = useAdminKey();
  const [notes, setNotes] = useState(tier3Case.adminNotes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (status: Tier3CaseStatus) => {
    setUpdatingStatus(true);
    setError(null);
    try {
      const updated = await updateTier3Case(adminKey, tier3Case.id, { status });
      onUpdated(updated);
    } catch (err) {
      if (err instanceof AdminUnauthorizedError) {
        clearAdminKey();
      } else {
        setError('Failed to update the status.');
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    setError(null);
    try {
      const updated = await updateTier3Case(adminKey, tier3Case.id, { adminNotes: notes });
      onUpdated(updated);
    } catch (err) {
      if (err instanceof AdminUnauthorizedError) {
        clearAdminKey();
      } else {
        setError('Failed to save notes.');
      }
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/admin/users/profiles/${tier3Case.userId}`}
            className="text-sm font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
          >
            {tier3Case.userEmail} →
          </Link>
          <p className="mt-1 text-xs text-slate-400">Requested {formatDateTime(tier3Case.createdAt)}</p>
          {tier3Case.targetOpportunityTitle && (
            <p className="mt-1 text-xs text-slate-500">
              {tier3Case.targetOpportunityTitle}
              {tier3Case.targetOpportunityProvider ? ` — ${tier3Case.targetOpportunityProvider}` : ''}
            </p>
          )}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[tier3Case.status]}`}>
          {humanizeStatus(tier3Case.status)}
        </span>
      </div>

      <label className="mt-4 block text-xs font-semibold text-slate-600">
        Status
        <select
          value={tier3Case.status}
          onChange={(e) => handleStatusChange(e.target.value as Tier3CaseStatus)}
          disabled={updatingStatus}
          className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {humanizeStatus(status)}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-3 block text-xs font-semibold text-slate-600">
        Internal notes (not shown to the user)
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
        />
      </label>
      <button
        type="button"
        onClick={handleSaveNotes}
        disabled={savingNotes || notes === (tier3Case.adminNotes ?? '')}
        className="mt-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {savingNotes ? 'Saving…' : 'Save notes'}
      </button>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// The founder-facing queue for Tier 3 ("full service, including applying on
// the user's behalf" — Monetization-Strategy.md §4.1 item 4) requests. This
// first pass covers status tracking and case notes only — setting a target
// opportunity, the signed agreement, and payment are later build steps (see
// Architecture.md's Tier 3 build order).
export default function AdminTier3CasesPage() {
  const { adminKey, clearAdminKey } = useAdminKey();
  const [cases, setCases] = useState<AdminTier3Case[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await listTier3Cases(adminKey);
      setCases(data);
    } catch (err) {
      if (err instanceof AdminUnauthorizedError) {
        clearAdminKey();
      } else {
        setError('Failed to load Tier 3 cases.');
      }
    }
  }, [adminKey, clearAdminKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const handleUpdated = (updated: AdminTier3Case) => {
    setCases((current) => current?.map((c) => (c.id === updated.id ? updated : c)) ?? current);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-xl font-semibold text-slate-950">Tier 3 cases</h1>
        <p className="mt-1 text-sm text-slate-600">
          Full-service requests — a real conversation (not self-checkout) comes before any
          agreement or payment. Track each case&apos;s status here.
        </p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 space-y-4">
          {cases === null ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : cases.length === 0 ? (
            <p className="text-sm text-slate-500">No Tier 3 requests yet.</p>
          ) : (
            cases.map((tier3Case) => (
              <CaseCard key={tier3Case.id} tier3Case={tier3Case} onUpdated={handleUpdated} />
            ))
          )}
        </div>
      </div>
    </main>
  );
}
