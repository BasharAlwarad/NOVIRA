'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  deliverCvRequest,
  fetchCoverLetterPdfBlob,
  fetchCvDraft,
  fetchCvPdfBlob,
  generateCvDraft,
  listCvRequests,
  reviseCvDraft,
  setCvReferenceExample,
  updateCvRequestStatus,
} from '@/lib/api/admin-cv-requests';
import type { AdminCvRequest, CvDraftResult, CvRequestStatus } from '@/lib/contracts/cv-requests';
import { useAdminKey } from '@/hooks/useAdminKey';
import { openInNewTabAfterFetch } from '@/lib/open-in-new-tab';

const STATUS_STYLES: Record<CvRequestStatus, string> = {
  Requested: 'bg-amber-50 text-amber-700',
  InReview: 'bg-sky-50 text-sky-700',
  Delivered: 'bg-emerald-50 text-emerald-700',
};

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Renders the AI-drafted structured content as readable text — not the
// final PDF look (that's a separate, not-yet-built rendering step), just
// enough for the admin to actually judge and revise the draft.
function DraftPreview({ draft }: { draft: CvDraftResult }) {
  if (!draft.cv || !draft.coverLetter) {
    return null;
  }

  const { cv, coverLetter } = draft;

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">CV</p>
        <p className="mt-2 text-sm font-semibold text-slate-900">{cv.fullName}</p>
        <p className="text-xs text-slate-500">
          {[cv.phone, cv.address, cv.dateOfBirth].filter(Boolean).join(' · ')}
        </p>
        {cv.summary && <p className="mt-2 text-sm text-slate-700">{cv.summary}</p>}

        {cv.experience.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-600">Experience</p>
            <div className="mt-1 space-y-2">
              {cv.experience.map((entry, i) => (
                <div key={i} className="text-sm text-slate-700">
                  <p className="font-medium">
                    {entry.title} — {entry.employer}
                    {entry.dateRange ? ` (${entry.dateRange})` : ''}
                  </p>
                  {entry.bullets.length > 0 && (
                    <ul className="mt-0.5 list-disc pl-5 text-xs text-slate-600">
                      {entry.bullets.map((bullet, bi) => (
                        <li key={bi}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {cv.education.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-600">Education</p>
            <div className="mt-1 space-y-1">
              {cv.education.map((entry, i) => (
                <p key={i} className="text-sm text-slate-700">
                  {entry.qualification} — {entry.institution}
                  {entry.dateRange ? ` (${entry.dateRange})` : ''}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 space-y-1 text-xs text-slate-600">
          {cv.skills && <p><span className="font-semibold">Skills: </span>{cv.skills}</p>}
          {cv.languages && <p><span className="font-semibold">Languages: </span>{cv.languages}</p>}
          {cv.certifications && <p><span className="font-semibold">Certifications: </span>{cv.certifications}</p>}
        </div>
      </div>

      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cover letter</p>
        <p className="mt-2 text-sm text-slate-700">{coverLetter.recipientLine}</p>
        <div className="mt-2 space-y-2">
          {coverLetter.paragraphs.map((paragraph, i) => (
            <p key={i} className="text-sm text-slate-700">{paragraph}</p>
          ))}
        </div>
        <p className="mt-2 text-sm text-slate-700">{coverLetter.closingLine}</p>
      </div>
    </div>
  );
}

function CvGenerationPanel({
  request,
  onUpdated,
}: {
  request: AdminCvRequest;
  onUpdated: (updated: AdminCvRequest) => void;
}) {
  const { adminKey } = useAdminKey();
  const [draft, setDraft] = useState<CvDraftResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [settingReference, setSettingReference] = useState(false);

  // Loads the already-generated draft on expand instead of requiring a
  // fresh "Generate" click (which would discard it and start over) — found
  // while building this panel, not live, but the same "don't make a
  // destructive action the only way to view something" instinct.
  useEffect(() => {
    if (request.hasDraft) {
      fetchCvDraft(adminKey, request.id)
        .then(setDraft)
        .catch(() => setError('Failed to load the existing draft.'));
    }
    // Only ever on mount for this specific request — re-fetching on every
    // prop change would clobber in-progress local edits/state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await generateCvDraft(adminKey, request.id);
      setDraft(result);
      if (result.error) setError(result.error);
      onUpdated({ ...request, hasDraft: !!result.cv, revisionCount: result.revisionCount });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate a draft.');
    } finally {
      setBusy(false);
    }
  };

  const handleRevise = async () => {
    if (!feedback.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await reviseCvDraft(adminKey, request.id, feedback.trim());
      setDraft(result);
      if (result.error) setError(result.error);
      else setFeedback('');
      onUpdated({ ...request, hasDraft: !!result.cv, revisionCount: result.revisionCount });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revise the draft.');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleReference = async () => {
    setSettingReference(true);
    try {
      const updated = await setCvReferenceExample(adminKey, request.id, !request.isReferenceExample);
      onUpdated(updated);
    } catch {
      setError('Failed to update the reference-example flag.');
    } finally {
      setSettingReference(false);
    }
  };

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={handleGenerate}
          className="rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Working…' : request.hasDraft ? 'Regenerate from scratch' : 'Generate with AI'}
        </button>
        {request.hasDraft && (
          <>
            <span className="text-xs text-slate-400">Revision {request.revisionCount}</span>
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={request.isReferenceExample}
                disabled={settingReference}
                onChange={handleToggleReference}
                className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-400"
              />
              Use as reference example
            </label>
          </>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {draft?.cv && (
        <>
          <DraftPreview draft={draft} />
          <p className="mt-2 text-[11px] text-slate-400">
            {draft.inputTokens + draft.outputTokens} tokens, ~${draft.estimatedCostUsd.toFixed(4)}
          </p>
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={async () => {
                try {
                  await openInNewTabAfterFetch(() => fetchCvPdfBlob(adminKey, request.id));
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to load the CV PDF.');
                }
              }}
              className="text-xs font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
            >
              View CV as PDF →
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await openInNewTabAfterFetch(() => fetchCoverLetterPdfBlob(adminKey, request.id));
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to load the cover letter PDF.');
                }
              }}
              className="text-xs font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
            >
              View cover letter as PDF →
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Ask for a change, e.g. 'shorten the summary'"
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
            />
            <button
              type="button"
              disabled={busy || !feedback.trim()}
              onClick={handleRevise}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ask AI to revise
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Status filter — mutually exclusive, so tabs rather than toggle chips (same
// reasoning as /matches' own status filter and /admin/opportunities' status
// tabs): a request is in exactly one of these at a time. Addresses the
// founder's direct ask — "delivered should be alone, new should be alone" —
// by letting the list be narrowed to just one status instead of always
// showing everything in one flat list.
type StatusFilter = 'All' | CvRequestStatus;
const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'All', label: 'All' },
  { key: 'Requested', label: 'Requested' },
  { key: 'InReview', label: 'In review' },
  { key: 'Delivered', label: 'Delivered' },
];

// Combinable (AND'd, not OR'd) toggle filters — unlike status above, a
// request can independently be e.g. both "needs a draft" and a reference
// example at the same time, so these are chips, not tabs.
type AttentionFlag = 'needsDraft' | 'referenceExample';
const ATTENTION_FLAGS: { key: AttentionFlag; label: string }[] = [
  { key: 'needsDraft', label: 'Needs a draft' },
  { key: 'referenceExample', label: 'Reference example' },
];

function matchesFlag(request: AdminCvRequest, flag: AttentionFlag): boolean {
  switch (flag) {
    case 'needsDraft':
      return !request.hasDraft;
    case 'referenceExample':
      return request.isReferenceExample;
  }
}

function parseFlagsParam(value: string | null): Set<AttentionFlag> {
  if (!value) return new Set();
  return new Set(
    value.split(',').filter((v): v is AttentionFlag => ATTENTION_FLAGS.some((f) => f.key === v))
  );
}

// The founder-facing queue for Tier2+ "request a CV" clicks on /matches
// (Architecture.md's "Tier 2 services" build order, step 4 — review before
// delivery), plus the AI generation/revision UI (step 5, built 2026-10-01).
// Status (Requested/InReview/Delivered) stays a pure tracking flag, not the
// delivery itself — the actual CV/cover letter content still goes out
// through the existing per-user message-compose tool on that user's own
// admin detail page, linked from each row below; PDF rendering and
// file-attachment delivery aren't built yet, so for now the admin copies
// the reviewed text from here into that message by hand.
function AdminCvRequestsPageContent() {
  const { adminKey } = useAdminKey();
  const [requests, setRequests] = useState<AdminCvRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const statusFilter = (searchParams.get('status') as StatusFilter | null) ?? 'All';
  const activeFlags = parseFlagsParam(searchParams.get('flags'));

  const load = useCallback(() => {
    listCvRequests(adminKey)
      .then(setRequests)
      .catch(() => setError('Failed to load CV requests.'));
  }, [adminKey]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdvance = async (request: AdminCvRequest, nextStatus: CvRequestStatus) => {
    setUpdatingId(request.id);
    setError(null);
    try {
      const updated = await updateCvRequestStatus(adminKey, request.id, nextStatus);
      setRequests((current) => current?.map((r) => (r.id === updated.id ? updated : r)) ?? current);
    } catch {
      setError('Failed to update that request — try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdated = (updated: AdminCvRequest) => {
    setRequests((current) => current?.map((r) => (r.id === updated.id ? updated : r)) ?? current);
  };

  const handleDeliver = async (request: AdminCvRequest) => {
    setDeliveringId(request.id);
    setError(null);
    try {
      const updated = await deliverCvRequest(adminKey, request.id);
      handleUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deliver the CV — try again.');
    } finally {
      setDeliveringId(null);
    }
  };

  const buildFilterHref = (nextStatus: StatusFilter, nextFlags: Set<AttentionFlag>): string => {
    const params = new URLSearchParams();
    if (nextStatus !== 'All') params.set('status', nextStatus);
    if (nextFlags.size > 0) params.set('flags', Array.from(nextFlags).join(','));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const toggleFlagHref = (flag: AttentionFlag): string => {
    const next = new Set(activeFlags);
    if (next.has(flag)) {
      next.delete(flag);
    } else {
      next.add(flag);
    }
    return buildFilterHref(statusFilter, next);
  };

  const search = searchInput.trim().toLowerCase();
  const filtered = (requests ?? []).filter((request) => {
    if (statusFilter !== 'All' && request.status !== statusFilter) {
      return false;
    }
    for (const flag of activeFlags) {
      if (!matchesFlag(request, flag)) {
        return false;
      }
    }
    if (
      search &&
      !request.userEmail.toLowerCase().includes(search) &&
      !request.opportunityTitle.toLowerCase().includes(search) &&
      !request.opportunityProvider.toLowerCase().includes(search)
    ) {
      return false;
    }
    return true;
  });

  const hasActiveFilters = statusFilter !== 'All' || activeFlags.size > 0 || search.length > 0;
  const statusCounts = STATUS_FILTERS.reduce<Record<StatusFilter, number>>(
    (acc, { key }) => {
      acc[key] = key === 'All' ? (requests?.length ?? 0) : (requests?.filter((r) => r.status === key).length ?? 0);
      return acc;
    },
    { All: 0, Requested: 0, InReview: 0, Delivered: 0 }
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-xl font-semibold text-slate-950">CV requests</h1>
      <p className="mt-1 text-sm text-slate-600">
        Tier 2+ users requesting a CV/cover letter for a specific match. Generate a draft with AI,
        ask for changes until it&apos;s right, then send it — the user gets both as real PDF
        attachments in their in-app messages.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        {requests
          ? `${filtered.length} of ${requests.length} request${requests.length === 1 ? '' : 's'}${hasActiveFilters ? ' match this filter' : ''}`
          : 'Loading…'}
      </p>

      <input
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder="Search by user email, opportunity title, or provider"
        className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
      />

      <div className="mt-4 flex flex-wrap gap-1 rounded-full bg-slate-100 p-1">
        {STATUS_FILTERS.map(({ key, label }) => {
          const active = key === statusFilter;
          return (
            <Link
              key={key}
              href={buildFilterHref(key, activeFlags)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label} ({statusCounts[key]})
            </Link>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {ATTENTION_FLAGS.map(({ key, label }) => {
          const active = activeFlags.has(key);
          return (
            <Link
              key={key}
              href={toggleFlagHref(key)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                active
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {label}
            </Link>
          );
        })}
        {hasActiveFilters && (
          <Link
            href={pathname}
            onClick={() => setSearchInput('')}
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
          >
            Clear all filters
          </Link>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-3">
        {requests === null ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-slate-500">No CV requests yet.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500">No requests match this filter.</p>
        ) : (
          filtered.map((request) => (
            <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {request.opportunityTitle}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{request.opportunityProvider}</p>
                  <Link
                    href={`/admin/users/profiles/${request.userId}`}
                    className="mt-1 inline-block text-xs font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
                  >
                    {request.userEmail} →
                  </Link>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[request.status]}`}
                >
                  {request.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">Requested {formatDateTime(request.createdAt)}</p>

              {request.status !== 'Delivered' && (
                <>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {request.status === 'Requested' && (
                      <button
                        type="button"
                        disabled={updatingId === request.id}
                        onClick={() => handleAdvance(request, 'InReview')}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Mark in review
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!request.hasDraft || deliveringId === request.id}
                      onClick={() => handleDeliver(request)}
                      title={request.hasDraft ? undefined : 'Generate an AI draft first'}
                      className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deliveringId === request.id ? 'Sending…' : 'Send CV & cover letter to user'}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    {request.hasDraft
                      ? 'Renders both as PDFs and sends them as real message attachments the user can download.'
                      : 'Generate an AI draft below before you can send it.'}
                  </p>
                </>
              )}

              <button
                type="button"
                onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                className="mt-3 text-xs font-semibold text-sky-700 underline underline-offset-2 hover:text-sky-800"
              >
                {expandedId === request.id ? 'Hide AI draft ↑' : request.hasDraft ? 'View AI draft →' : 'Generate AI draft →'}
              </button>

              {expandedId === request.id && (
                <CvGenerationPanel request={request} onUpdated={handleUpdated} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// useSearchParams() requires a <Suspense> boundary or the production build
// fails to prerender the route — same fix already applied elsewhere
// (/matches, the admin opportunities and users pages).
export default function AdminCvRequestsPage() {
  return (
    <Suspense fallback={null}>
      <AdminCvRequestsPageContent />
    </Suspense>
  );
}
