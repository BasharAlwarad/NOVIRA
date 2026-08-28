'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AdminUnauthorizedError,
  createOpportunity,
  listOpportunities,
  syncAusbildung,
  updateOpportunityStatus,
} from '@/lib/api/opportunities';
import type {
  CreateOpportunityRequest,
  Opportunity,
  OpportunityEducationLevel,
  OpportunityLanguageLevel,
  OpportunityPath,
} from '@/lib/contracts/opportunities';
import { useAdminKey } from '@/hooks/useAdminKey';

const LANGUAGE_LEVEL_OPTIONS: OpportunityLanguageLevel[] = [
  'None', 'A1', 'A2', 'B1', 'B2', 'C1', 'C1Plus', 'Beginner', 'Intermediate', 'Advanced', 'Fluent',
];

const EDUCATION_LEVEL_OPTIONS: OpportunityEducationLevel[] = [
  'HighSchool', 'TechnicalDiploma', 'Bachelors', 'Masters', 'Doctorate',
];

const EMPTY_FORM: CreateOpportunityRequest = {
  title: '',
  provider: '',
  path: 'University',
  location: '',
  description: '',
  sourceUrl: '',
  occupationField: '',
  requiredGermanLevel: null,
  requiredEnglishLevel: null,
  requiresCertifiedLanguageProof: false,
  minEducationLevel: null,
  monthlyCompensationEur: null,
  tuitionFeeEur: null,
  startDate: null,
  applicationDeadline: null,
};

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

// The manual-curation counterpart to the "Generate Ausbildung" sync button —
// for sources with no API to sync from (currently: all University data, per
// Matching-Algorithm-Study.md §8's interim plan: hand-curate a starter set
// the same way occupation-demand.ts is curated). Lands as Pending, same
// review gate as every other opportunity — nothing here is auto-approved.
function AddOpportunityForm({
  onSubmit,
}: {
  onSubmit: (request: CreateOpportunityRequest) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState<CreateOpportunityRequest>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const update = <K extends keyof CreateOpportunityRequest>(
    key: K,
    value: CreateOpportunityRequest[K]
  ) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      await onSubmit({
        ...form,
        location: form.location || null,
        description: form.description || null,
        sourceUrl: form.sourceUrl || null,
        occupationField: form.occupationField || null,
      });
      setForm(EMPTY_FORM);
      setMessage('Added as Pending — review it below.');
    } catch {
      setMessage('Failed to add — check the fields and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-6 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        + Add opportunity manually
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 rounded-3xl border border-slate-200 bg-white p-5"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">
          Add opportunity manually
        </p>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Close
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          required
          placeholder="Title (e.g. B.Sc. Nursing Science)"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
        />
        <input
          required
          placeholder="Provider (university name)"
          value={form.provider}
          onChange={(e) => update('provider', e.target.value)}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
        />
        <select
          value={form.path}
          onChange={(e) => update('path', e.target.value as OpportunityPath)}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
        >
          <option value="University">University</option>
          <option value="Ausbildung">Ausbildung</option>
        </select>
        <input
          placeholder="Location (city)"
          value={form.location ?? ''}
          onChange={(e) => update('location', e.target.value)}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
        />
        <input
          placeholder="Occupation field key (e.g. nursing)"
          value={form.occupationField ?? ''}
          onChange={(e) => update('occupationField', e.target.value)}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
        />
        <input
          type="url"
          placeholder="Source URL (official page)"
          value={form.sourceUrl ?? ''}
          onChange={(e) => update('sourceUrl', e.target.value)}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
        />

        <select
          value={form.minEducationLevel ?? ''}
          onChange={(e) =>
            update(
              'minEducationLevel',
              (e.target.value || null) as OpportunityEducationLevel | null
            )
          }
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
        >
          <option value="">Min. education — none stated</option>
          {EDUCATION_LEVEL_OPTIONS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.requiresCertifiedLanguageProof}
            onChange={(e) => update('requiresCertifiedLanguageProof', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-400"
          />
          Certified language proof required
        </label>

        <select
          value={form.requiredGermanLevel ?? ''}
          onChange={(e) =>
            update(
              'requiredGermanLevel',
              (e.target.value || null) as OpportunityLanguageLevel | null
            )
          }
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
        >
          <option value="">Required German — none stated</option>
          {LANGUAGE_LEVEL_OPTIONS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
        <select
          value={form.requiredEnglishLevel ?? ''}
          onChange={(e) =>
            update(
              'requiredEnglishLevel',
              (e.target.value || null) as OpportunityLanguageLevel | null
            )
          }
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
        >
          <option value="">Required English — none stated</option>
          {LANGUAGE_LEVEL_OPTIONS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Tuition fee EUR/semester (0 = tuition-free)"
          value={form.tuitionFeeEur ?? ''}
          onChange={(e) => update('tuitionFeeEur', e.target.value === '' ? null : Number(e.target.value))}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
        />
        <input
          type="number"
          placeholder="Monthly compensation EUR (Ausbildung)"
          value={form.monthlyCompensationEur ?? ''}
          onChange={(e) =>
            update('monthlyCompensationEur', e.target.value === '' ? null : Number(e.target.value))
          }
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
        />

        <label className="text-xs text-slate-500">
          Start date
          <input
            type="date"
            value={form.startDate ?? ''}
            onChange={(e) => update('startDate', e.target.value || null)}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
          />
        </label>
        <label className="text-xs text-slate-500">
          Application deadline
          <input
            type="date"
            value={form.applicationDeadline ?? ''}
            onChange={(e) => update('applicationDeadline', e.target.value || null)}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
          />
        </label>

        <textarea
          placeholder="Description"
          value={form.description ?? ''}
          onChange={(e) => update('description', e.target.value)}
          rows={2}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:col-span-2"
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Adding…' : 'Add as Pending'}
        </button>
        {message && <p className="text-xs text-slate-500">{message}</p>}
      </div>
    </form>
  );
}

// One section per OpportunityPath — pending/reviewed still splits within a
// section, but Ausbildung and University are never rendered as one mixed
// list (Matching-Algorithm-Study.md §8 / CLAUDE.md Phase 2 checklist).
// `action`/`message` let the caller attach a per-path "Generate" control
// (data acquisition stays a manually-triggered, per-path action — see the
// same doc — not shared or auto-scheduled).
function PathSection({
  title,
  opportunities,
  onDecide,
  action,
  message,
}: {
  title: string;
  opportunities: Opportunity[];
  onDecide: (id: string, status: 'Approved' | 'Denied') => void;
  action?: React.ReactNode;
  message?: string | null;
}) {
  const pending = opportunities.filter((o) => o.status === 'Pending');
  const reviewed = opportunities.filter((o) => o.status !== 'Pending');

  return (
    <section className="mt-10 first:mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-2">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-500">
            {pending.length} pending, {reviewed.length} reviewed
          </p>
          {action}
        </div>
      </div>
      {message && <p className="mt-2 text-xs text-slate-500">{message}</p>}

      <div className="mt-4 space-y-4">
        {pending.map((opportunity) => (
          <OpportunityRow
            key={opportunity.id}
            opportunity={opportunity}
            onDecide={onDecide}
          />
        ))}
        {pending.length === 0 && (
          <p className="text-sm text-slate-500">Nothing pending.</p>
        )}
      </div>

      {reviewed.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-500">
            Already reviewed
          </h3>
          <div className="mt-4 space-y-4">
            {reviewed.map((opportunity) => (
              <OpportunityRow
                key={opportunity.id}
                opportunity={opportunity}
                onDecide={onDecide}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default function AdminOpportunitiesPage() {
  const { adminKey, clearAdminKey } = useAdminKey();
  const [opportunities, setOpportunities] = useState<Opportunity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingAusbildung, setGeneratingAusbildung] = useState(false);
  const [ausbildungMessage, setAusbildungMessage] = useState<string | null>(null);

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
        (current) =>
          current?.map((item) => (item.id === updated.id ? updated : item)) ?? null
      );
    } catch (err) {
      if (err instanceof AdminUnauthorizedError) {
        clearAdminKey();
      } else {
        setError('Failed to update that opportunity.');
      }
    }
  };

  const handleGenerateAusbildung = async () => {
    if (generatingAusbildung) return;

    setGeneratingAusbildung(true);
    setAusbildungMessage(null);
    try {
      const { added } = await syncAusbildung(adminKey);
      setAusbildungMessage(
        added > 0
          ? `Added ${added} new listing${added === 1 ? '' : 's'} as Pending.`
          : 'No new listings found — everything currently live was already synced.'
      );
      await loadOpportunities();
    } catch (err) {
      if (err instanceof AdminUnauthorizedError) {
        clearAdminKey();
      } else {
        setAusbildungMessage('Failed to generate — try again.');
      }
    } finally {
      setGeneratingAusbildung(false);
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

  const totalPending = opportunities?.filter((o) => o.status === 'Pending').length ?? 0;
  const totalReviewed = opportunities?.filter((o) => o.status !== 'Pending').length ?? 0;
  const ausbildung = opportunities?.filter((o) => o.path === 'Ausbildung') ?? [];
  const university = opportunities?.filter((o) => o.path === 'University') ?? [];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-semibold text-slate-950">
          Opportunities review
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {totalPending} pending, {totalReviewed} reviewed.
        </p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <AddOpportunityForm onSubmit={handleAddOpportunity} />

        {opportunities === null ? (
          <p className="mt-8 text-sm text-slate-500">Loading…</p>
        ) : (
          <>
            <PathSection
              title="Ausbildung"
              opportunities={ausbildung}
              onDecide={handleDecide}
              message={ausbildungMessage}
              action={
                <button
                  type="button"
                  onClick={handleGenerateAusbildung}
                  disabled={generatingAusbildung}
                  className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generatingAusbildung ? 'Generating…' : 'Generate Ausbildung'}
                </button>
              }
            />
            <PathSection
              title="University"
              opportunities={university}
              onDecide={handleDecide}
              action={
                <button
                  type="button"
                  disabled
                  title="Not built yet — needs an AI-assisted research pipeline with a source-credibility design (Matching-Algorithm-Study.md §8), unlike Ausbildung's government API sync."
                  className="cursor-not-allowed rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400"
                >
                  Generate University (coming soon)
                </button>
              }
            />
          </>
        )}
      </div>
    </main>
  );
}
