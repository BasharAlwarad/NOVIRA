'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { SearchableSelect, type SearchableSelectOption } from '@/components/assessment/SearchableSelect';
import type {
  CreateOpportunityRequest,
  Opportunity,
  OpportunityEducationLevel,
  OpportunityLanguageLevel,
  OpportunityPath,
} from '@/lib/contracts/opportunities';
import { OccupationField } from '@/types/assessment';

export const LANGUAGE_LEVEL_OPTIONS: OpportunityLanguageLevel[] = [
  'None', 'A1', 'A2', 'B1', 'B2', 'C1', 'C1Plus', 'Beginner', 'Intermediate', 'Advanced', 'Fluent',
];

export const EDUCATION_LEVEL_OPTIONS: OpportunityEducationLevel[] = [
  'HighSchool', 'TechnicalDiploma', 'Bachelors', 'Masters', 'Doctorate',
];

export const STATUS_STYLES: Record<Opportunity['status'], string> = {
  Pending: 'bg-amber-50 text-amber-700',
  Approved: 'bg-emerald-50 text-emerald-700',
  Denied: 'bg-red-50 text-red-700',
};

// "mechatronics-technician" -> "Mechatronics Technician". Good enough to
// review by; not wired to the full 110-entry OccupationField question copy
// from the assessment schema (prompts/descriptions) — this stays decoupled
// from public-facing question text, it just reuses the enum's own values as
// the canonical, typo-proof set of keys (see OCCUPATION_FIELD_OPTIONS below,
// added 2026-08-30 to close a real correctness gap: the old free-text input
// let a typo silently create an opportunity that could never match anyone,
// since OccupationField is an exact-string hard filter in MatchingService).
export function humanizeSlug(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// "HighSchool" -> "High School", "C1Plus" -> "C1 Plus". Values that are
// already short codes (e.g. "B1") pass through unchanged.
export function humanizeEnumValue(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

export function formatEur(amount: number): string {
  return `€${amount.toLocaleString('en-US')}`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// The same 110 keys the assessment's own occupationField question offers,
// reused as-is (not the question's label/description copy) so this
// dropdown can never drift from what MatchingService actually compares
// against, and a typo becomes structurally impossible instead of just
// unlikely.
export const OCCUPATION_FIELD_OPTIONS: SearchableSelectOption[] = Object.values(OccupationField).map((value) => ({
  value,
  label: humanizeSlug(value),
}));

export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

export function OpportunityRow({
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
        {opportunity.source === 'AiResearch' && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
            AI-researched — verify source link
          </span>
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

// The manual-curation counterpart to the "Generate X" sync/research
// buttons — for one-off additions alongside automated sourcing. Path is
// fixed by the page this renders on (no path selector — the old shared
// form let you add a University row from anywhere, which no longer makes
// sense now each path has its own page), lands as Pending, same review
// gate as everything else.
export function AddOpportunityForm({
  path,
  onSubmit,
}: {
  path: OpportunityPath;
  onSubmit: (request: CreateOpportunityRequest) => Promise<void>;
}) {
  const emptyForm: CreateOpportunityRequest = {
    title: '',
    provider: '',
    path,
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

  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState<CreateOpportunityRequest>(emptyForm);
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
      setForm(emptyForm);
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
        + Add {path} opportunity manually
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
          Add {path} opportunity manually
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
          placeholder="Provider (institution/employer name)"
          value={form.provider}
          onChange={(e) => update('provider', e.target.value)}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
        />
        <input
          placeholder="Location (city)"
          value={form.location ?? ''}
          onChange={(e) => update('location', e.target.value)}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
        />
        <input
          type="url"
          placeholder="Source URL (official page)"
          value={form.sourceUrl ?? ''}
          onChange={(e) => update('sourceUrl', e.target.value)}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
        />

        <div className="sm:col-span-2">
          <SearchableSelect
            options={OCCUPATION_FIELD_OPTIONS}
            value={form.occupationField || null}
            onChange={(value) => update('occupationField', value)}
            placeholder="Occupation field — search…"
          />
        </div>

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

// The Ausbildung/University sub-nav — separate from the top-level admin nav
// (Opportunities/Users) in layout.tsx, since only this section has two
// paths to switch between.
const PATH_TABS: { label: string; href: string }[] = [
  { label: 'Ausbildung', href: '/admin/opportunities/ausbildung' },
  { label: 'University', href: '/admin/opportunities/university' },
];

export function PathTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
      {PATH_TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export type StatusFilter = 'All' | 'Pending' | 'Approved' | 'Denied';

const STATUS_FILTERS: StatusFilter[] = ['All', 'Pending', 'Approved', 'Denied'];

// Backed by a URL search param (?status=), not local component state, so a
// filtered view is bookmarkable/shareable and survives a page refresh —
// e.g. a link straight to "Pending University" for a reviewer to jump to.
export function StatusFilterTabs({ counts }: { counts: Record<StatusFilter, number> }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeFilter = (searchParams.get('status') as StatusFilter | null) ?? 'Pending';

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {STATUS_FILTERS.map((filter) => {
        const active = filter === activeFilter;
        const href = filter === 'Pending' ? pathname : `${pathname}?status=${filter}`;
        return (
          <Link
            key={filter}
            href={href}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              active
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {filter} ({counts[filter]})
          </Link>
        );
      })}
    </div>
  );
}

export function filterByStatus(opportunities: Opportunity[], filter: StatusFilter): Opportunity[] {
  if (filter === 'All') {
    return opportunities;
  }
  return opportunities.filter((o) => o.status === filter);
}

export function computeStatusCounts(opportunities: Opportunity[]): Record<StatusFilter, number> {
  return {
    All: opportunities.length,
    Pending: opportunities.filter((o) => o.status === 'Pending').length,
    Approved: opportunities.filter((o) => o.status === 'Approved').length,
    Denied: opportunities.filter((o) => o.status === 'Denied').length,
  };
}
