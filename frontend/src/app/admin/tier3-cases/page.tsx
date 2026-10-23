'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AdminUnauthorizedError,
  listTier3Cases,
  requestTier3SuccessFee,
  sendTier3Agreement,
  updateTier3Case,
} from '@/lib/api/admin-tier3';
import { listOpportunities } from '@/lib/api/opportunities';
import type { AdminTier3Case, Tier3CaseStatus } from '@/lib/contracts/tier3';
import type { Opportunity } from '@/lib/contracts/opportunities';
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

// A lightweight search-as-you-type picker over the existing Approved
// opportunities list (GET /admin/opportunities, already built) — no new
// backend listing endpoint needed. Opportunities are fetched once at the
// page level (not per-card) and passed down, since the admin may open the
// picker on several cards in one visit. Only Approved opportunities are
// offered — picking a Pending or Denied one as a Tier 3 target wouldn't
// make sense.
function TargetOpportunityPicker({
  opportunities,
  onPick,
  onClose,
}: {
  opportunities: Opportunity[];
  onPick: (opportunityId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const approved = opportunities.filter((o) => o.status === 'Approved');
  const matches =
    query.trim().length === 0
      ? approved.slice(0, 20)
      : approved
          .filter(
            (o) =>
              o.title.toLowerCase().includes(query.toLowerCase()) ||
              o.provider.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 20);

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <input
          type="text"
          autoFocus
          placeholder="Search by title or provider…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
        />
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-700"
        >
          Cancel
        </button>
      </div>
      <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
        {matches.length === 0 ? (
          <p className="px-1 py-2 text-xs text-slate-500">No matching Approved opportunities.</p>
        ) : (
          matches.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onPick(o.id)}
              className="block w-full rounded-lg px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-white"
            >
              <span className="font-semibold">{o.title}</span> — {o.provider}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function CaseCard({
  tier3Case,
  onUpdated,
  opportunities,
  onLoadOpportunities,
}: {
  tier3Case: AdminTier3Case;
  onUpdated: (updated: AdminTier3Case) => void;
  opportunities: Opportunity[] | null;
  onLoadOpportunities: () => void;
}) {
  const { adminKey, clearAdminKey } = useAdminKey();
  const [notes, setNotes] = useState(tier3Case.adminNotes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [sendingAgreement, setSendingAgreement] = useState(false);
  const [requestingSuccessFee, setRequestingSuccessFee] = useState(false);
  const [pickingOpportunity, setPickingOpportunity] = useState(false);
  const [settingOpportunity, setSettingOpportunity] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenPicker = () => {
    setPickingOpportunity(true);
    if (!opportunities) {
      onLoadOpportunities();
    }
  };

  const handlePickOpportunity = async (opportunityId: string) => {
    setSettingOpportunity(true);
    setError(null);
    try {
      const updated = await updateTier3Case(adminKey, tier3Case.id, { targetOpportunityId: opportunityId });
      onUpdated(updated);
      setPickingOpportunity(false);
    } catch (err) {
      if (err instanceof AdminUnauthorizedError) {
        clearAdminKey();
      } else {
        setError('Failed to set the target opportunity.');
      }
    } finally {
      setSettingOpportunity(false);
    }
  };

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

  const handleSendAgreement = async () => {
    setSendingAgreement(true);
    setError(null);
    try {
      const updated = await sendTier3Agreement(adminKey, tier3Case.id);
      onUpdated(updated);
    } catch (err) {
      if (err instanceof AdminUnauthorizedError) {
        clearAdminKey();
      } else {
        setError('Failed to send the agreement.');
      }
    } finally {
      setSendingAgreement(false);
    }
  };

  const handleRequestSuccessFee = async () => {
    setRequestingSuccessFee(true);
    setError(null);
    try {
      const updated = await requestTier3SuccessFee(adminKey, tier3Case.id);
      onUpdated(updated);
    } catch (err) {
      if (err instanceof AdminUnauthorizedError) {
        clearAdminKey();
      } else {
        setError('Failed to request the success fee.');
      }
    } finally {
      setRequestingSuccessFee(false);
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
          {tier3Case.targetOpportunityTitle ? (
            <p className="mt-1 text-xs text-slate-500">
              {tier3Case.targetOpportunityTitle}
              {tier3Case.targetOpportunityProvider ? ` — ${tier3Case.targetOpportunityProvider}` : ''}
              {' · '}
              <button
                type="button"
                onClick={handleOpenPicker}
                className="font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Change
              </button>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleOpenPicker}
              className="mt-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              + Set target opportunity
            </button>
          )}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[tier3Case.status]}`}>
          {humanizeStatus(tier3Case.status)}
        </span>
      </div>

      {pickingOpportunity &&
        (opportunities ? (
          settingOpportunity ? (
            <p className="mt-3 text-xs text-slate-500">Setting…</p>
          ) : (
            <TargetOpportunityPicker
              opportunities={opportunities}
              onPick={handlePickOpportunity}
              onClose={() => setPickingOpportunity(false)}
            />
          )
        ) : (
          <p className="mt-3 text-xs text-slate-500">Loading opportunities…</p>
        ))}

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

      {tier3Case.agreementSentAt ? (
        <p className="mt-3 text-xs text-slate-500">
          Agreement sent {formatDateTime(tier3Case.agreementSentAt)} — €{tier3Case.upfrontAmountEur}
          {tier3Case.signedAt ? `, signed ${formatDateTime(tier3Case.signedAt)}` : ', not yet signed'}
        </p>
      ) : (
        <button
          type="button"
          onClick={handleSendAgreement}
          disabled={sendingAgreement || tier3Case.status !== 'ConsultationScheduled'}
          className="mt-3 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          title={tier3Case.status !== 'ConsultationScheduled' ? 'Move the status to Consultation Scheduled first' : undefined}
        >
          {sendingAgreement ? 'Sending…' : 'Send agreement'}
        </button>
      )}

      {tier3Case.status === 'Secured' &&
        (tier3Case.successFeeRequestedAt ? (
          <p className="mt-3 text-xs text-slate-500">
            Success fee requested {formatDateTime(tier3Case.successFeeRequestedAt)}
            {tier3Case.successFeePaidAt ? `, paid ${formatDateTime(tier3Case.successFeePaidAt)}` : ', not yet paid'}
          </p>
        ) : (
          <button
            type="button"
            onClick={handleRequestSuccessFee}
            disabled={requestingSuccessFee}
            className="mt-3 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {requestingSuccessFee ? 'Sending…' : 'Request success fee'}
          </button>
        ))}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// The founder-facing queue for Tier 3 ("full service, including applying on
// the user's behalf" — Monetization-Strategy.md §4.1 item 4) requests.
// Covers status tracking, case notes, setting a target opportunity, the
// signed agreement, and payment (see Architecture.md's Tier 3 build order).
export default function AdminTier3CasesPage() {
  const { adminKey, clearAdminKey } = useAdminKey();
  const [cases, setCases] = useState<AdminTier3Case[] | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[] | null>(null);
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

  // Fetched once, lazily, the first time any card's picker is opened — not
  // on initial page load, since most visits to this page don't need it.
  const handleLoadOpportunities = useCallback(() => {
    if (opportunities) return;
    listOpportunities(adminKey)
      .then(setOpportunities)
      .catch(() => {
        // Left null on failure — each card's picker shows its own "Loading…"
        // state indefinitely rather than a dedicated error, acceptable for
        // this admin-only tool; retrying means reopening the picker.
      });
  }, [adminKey, opportunities]);

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
              <CaseCard
                key={tier3Case.id}
                tier3Case={tier3Case}
                onUpdated={handleUpdated}
                opportunities={opportunities}
                onLoadOpportunities={handleLoadOpportunities}
              />
            ))
          )}
        </div>
      </div>
    </main>
  );
}
