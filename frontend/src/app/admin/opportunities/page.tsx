'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AdminUnauthorizedError,
  listOpportunities,
  updateOpportunityStatus,
} from '@/lib/api/opportunities';
import type { Opportunity } from '@/lib/contracts/opportunities';

const ADMIN_KEY_STORAGE_KEY = 'novira.admin.key';

const STATUS_STYLES: Record<Opportunity['status'], string> = {
  Pending: 'bg-amber-50 text-amber-700',
  Approved: 'bg-emerald-50 text-emerald-700',
  Denied: 'bg-red-50 text-red-700',
};

// "mechatronics-technician" -> "Mechatronics Technician". Good enough to
// review by; not wired to the full 110-entry OccupationField label lookup
// from the assessment schema, to keep this internal tool decoupled from the
// public-facing question definitions.
function humanizeSlug(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// "HighSchool" -> "High School", "C1Plus" -> "C1 Plus". Values that are
// already short codes (e.g. "B1") pass through unchanged.
function humanizeEnumValue(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

function formatEur(amount: number): string {
  return `€${amount.toLocaleString('en-US')}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

function OpportunityRow({
  opportunity,
  onDecide,
}: {
  opportunity: Opportunity;
  onDecide: (id: string, status: 'Approved' | 'Denied') => void;
}) {
  const compensationOrTuition =
    opportunity.monthlyCompensationEur != null
      ? `${formatEur(opportunity.monthlyCompensationEur)}/month`
      : opportunity.tuitionFeeEur != null
        ? opportunity.tuitionFeeEur === 0
          ? 'Tuition-free'
          : `${formatEur(opportunity.tuitionFeeEur)}/semester`
        : null;

  const timelineParts = [
    opportunity.startDate ? `Starts ${formatDate(opportunity.startDate)}` : null,
    opportunity.applicationDeadline
      ? `Apply by ${formatDate(opportunity.applicationDeadline)}`
      : null,
  ].filter(Boolean);

  const factsLine = [compensationOrTuition, ...timelineParts].filter(Boolean);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {opportunity.path}
          </p>
          <h2 className="mt-1 text-base font-semibold text-slate-950">
            {opportunity.title}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {opportunity.provider}
            {opportunity.location ? ` — ${opportunity.location}` : ''}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[opportunity.status]}`}
        >
          {opportunity.status}
        </span>
      </div>

      {opportunity.description && (
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {opportunity.description}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {opportunity.occupationField && (
          <Chip>{humanizeSlug(opportunity.occupationField)}</Chip>
        )}
        {opportunity.minEducationLevel && (
          <Chip>Min. {humanizeEnumValue(opportunity.minEducationLevel)}</Chip>
        )}
        {opportunity.requiredGermanLevel && opportunity.requiredGermanLevel !== 'None' && (
          <Chip>German {humanizeEnumValue(opportunity.requiredGermanLevel)}</Chip>
        )}
        {opportunity.requiredEnglishLevel && opportunity.requiredEnglishLevel !== 'None' && (
          <Chip>English {humanizeEnumValue(opportunity.requiredEnglishLevel)}</Chip>
        )}
        {opportunity.requiresCertifiedLanguageProof && (
          <Chip>Certified proof required</Chip>
        )}
      </div>

      {factsLine.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">{factsLine.join(' · ')}</p>
      )}

      {opportunity.sourceUrl && (
        <a
          href={opportunity.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600"
        >
          {opportunity.sourceUrl}
        </a>
      )}

      {opportunity.status === 'Pending' && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onDecide(opportunity.id, 'Approved')}
            className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => onDecide(opportunity.id, 'Denied')}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Deny
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminOpportunitiesPage() {
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [opportunities, setOpportunities] = useState<Opportunity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAdminKey(window.sessionStorage.getItem(ADMIN_KEY_STORAGE_KEY));
  }, []);

  const loadOpportunities = useCallback(async (key: string) => {
    setError(null);
    try {
      const data = await listOpportunities(key);
      setOpportunities(data);
    } catch (err) {
      if (err instanceof AdminUnauthorizedError) {
        window.sessionStorage.removeItem(ADMIN_KEY_STORAGE_KEY);
        setAdminKey(null);
        setError('That key was rejected. Try again.');
      } else {
        setError('Failed to load opportunities.');
      }
    }
  }, []);

  useEffect(() => {
    if (adminKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadOpportunities(adminKey);
    }
  }, [adminKey, loadOpportunities]);

  const handleUnlock = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.sessionStorage.setItem(ADMIN_KEY_STORAGE_KEY, keyInput);
    setAdminKey(keyInput);
  };

  const handleDecide = async (id: string, status: 'Approved' | 'Denied') => {
    if (!adminKey) return;

    try {
      const updated = await updateOpportunityStatus(adminKey, id, status);
      setOpportunities(
        (current) =>
          current?.map((item) => (item.id === updated.id ? updated : item)) ?? null
      );
    } catch (err) {
      if (err instanceof AdminUnauthorizedError) {
        window.sessionStorage.removeItem(ADMIN_KEY_STORAGE_KEY);
        setAdminKey(null);
      } else {
        setError('Failed to update that opportunity.');
      }
    }
  };

  if (adminKey === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <form
          onSubmit={handleUnlock}
          className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <h1 className="text-lg font-semibold text-slate-950">Admin access</h1>
          <p className="mt-1 text-sm text-slate-600">
            Enter the admin key to review opportunities.
          </p>
          <input
            type="password"
            value={keyInput}
            onChange={(event) => setKeyInput(event.target.value)}
            placeholder="Admin key"
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="mt-4 w-full rounded-full bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            Unlock
          </button>
        </form>
      </main>
    );
  }

  const pending = opportunities?.filter((o) => o.status === 'Pending') ?? [];
  const reviewed = opportunities?.filter((o) => o.status !== 'Pending') ?? [];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-semibold text-slate-950">
          Opportunities review
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {pending.length} pending, {reviewed.length} reviewed.
        </p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {opportunities === null ? (
          <p className="mt-8 text-sm text-slate-500">Loading…</p>
        ) : (
          <>
            <div className="mt-8 space-y-4">
              {pending.map((opportunity) => (
                <OpportunityRow
                  key={opportunity.id}
                  opportunity={opportunity}
                  onDecide={handleDecide}
                />
              ))}
              {pending.length === 0 && (
                <p className="text-sm text-slate-500">Nothing pending.</p>
              )}
            </div>

            {reviewed.length > 0 && (
              <div className="mt-10">
                <h2 className="text-sm font-semibold text-slate-500">
                  Already reviewed
                </h2>
                <div className="mt-4 space-y-4">
                  {reviewed.map((opportunity) => (
                    <OpportunityRow
                      key={opportunity.id}
                      opportunity={opportunity}
                      onDecide={handleDecide}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
