'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AdminUnauthorizedError,
  deleteUser,
  getUserDetail,
  recomputeVerifiedData,
  reviewDocument,
  sendMessageToUser,
} from '@/lib/api/admin-users';
import type { AdminDocument, AdminUserDetail, ReviewDocumentRequest } from '@/lib/contracts/admin-users';
import type { Message } from '@/lib/contracts/messages';
import { useAdminKey } from '@/hooks/useAdminKey';

function humanizeEnumValue(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const REVIEW_STATUS_STYLES: Record<AdminDocument['reviewStatus'], string> = {
  PendingReview: 'bg-amber-50 text-amber-700',
  Approved: 'bg-emerald-50 text-emerald-700',
  Denied: 'bg-slate-100 text-slate-600',
  FlaggedRed: 'bg-red-50 text-red-700',
};

function DocumentCard({
  document,
  onReview,
}: {
  document: AdminDocument;
  onReview: (documentId: string, request: ReviewDocumentRequest) => Promise<void>;
}) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState<ReviewDocumentRequest['status'] | null>(null);

  const handleAction = async (status: ReviewDocumentRequest['status']) => {
    setSubmitting(status);
    try {
      await onReview(document.id, { status, note: note.trim() || null });
      setNote('');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {document.documentType ? humanizeEnumValue(document.documentType) : 'Type not yet determined'}
          </p>
          <h3 className="mt-1 text-sm font-semibold text-slate-950">{document.name}</h3>
          <p className="mt-1 text-xs text-slate-500">
            {document.originalFileName} · Uploaded {formatDateTime(document.uploadedAt)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${REVIEW_STATUS_STYLES[document.reviewStatus]}`}
        >
          {humanizeEnumValue(document.reviewStatus)}
        </span>
      </div>

      {document.previewUrl &&
        (document.contentType === 'application/pdf' ? (
          <a
            href={document.previewUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-xs text-emerald-700 underline underline-offset-2"
          >
            Open PDF
          </a>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={document.previewUrl}
            alt={document.originalFileName}
            className="mt-3 max-h-72 w-auto rounded-2xl border border-slate-200 object-contain"
          />
        ))}

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          AI review — {document.aiVerificationStatus}
        </p>
        {document.aiVerificationStatus === 'Completed' ? (
          <>
            {document.aiSummary && <p className="mt-2 text-sm text-slate-700">{document.aiSummary}</p>}
            <dl className="mt-3 grid grid-cols-1 gap-1 text-xs text-slate-600 sm:grid-cols-2">
              <div>
                <dt className="inline font-semibold">Extracted name: </dt>
                <dd className="inline">{document.aiExtractedName || '—'}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Matches profile: </dt>
                <dd className="inline">
                  {document.aiNameMatchesProfile == null
                    ? '—'
                    : document.aiNameMatchesProfile
                      ? 'Yes'
                      : 'No'}
                </dd>
              </div>
              <div>
                <dt className="inline font-semibold">Detected type: </dt>
                <dd className="inline">{document.aiDocumentTypeDetected || '—'}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Issuer: </dt>
                <dd className="inline">{document.aiIssuerOrInstitution || '—'}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Expiry: </dt>
                <dd className="inline">{document.aiExpiryDate || '—'}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Legible: </dt>
                <dd className="inline">
                  {document.aiLegible == null ? '—' : document.aiLegible ? 'Yes' : 'No'}
                </dd>
              </div>
              <div>
                <dt className="inline font-semibold">Date of birth: </dt>
                <dd className="inline">{document.aiDateOfBirth || '—'}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Nationality: </dt>
                <dd className="inline">{document.aiNationality || '—'}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Document number: </dt>
                <dd className="inline">{document.aiDocumentNumber || '—'}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Education level: </dt>
                <dd className="inline">{document.aiHighestEducationLevel || '—'}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Field of study: </dt>
                <dd className="inline">{document.aiFieldOfStudy || '—'}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Certified language/level: </dt>
                <dd className="inline">
                  {document.aiCertifiedLanguage && document.aiCertifiedLevel
                    ? `${document.aiCertifiedLanguage} — ${document.aiCertifiedLevel}`
                    : '—'}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-[11px] text-slate-400">
              These fields are written onto the account&rsquo;s verified profile if you Approve this document.
            </p>
            {document.aiFlags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {document.aiFlags.map((flag, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700"
                  >
                    {flag}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : document.aiVerificationStatus === 'Failed' ? (
          <p className="mt-2 text-sm text-slate-600">
            AI verification failed for this document — review it manually below.
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-600">Verification in progress…</p>
        )}
      </div>

      {document.reviewNote && (
        <p className="mt-3 text-xs text-slate-500">
          <span className="font-semibold">Review note: </span>
          {document.reviewNote}
        </p>
      )}
      {document.rejectionMessageSent && (
        <p className="mt-1 text-xs text-slate-400">The user was notified — see their in-app message.</p>
      )}

      {document.reviewStatus === 'PendingReview' && (
        <div className="mt-4 space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note (included in the email for Deny / Flag red)"
            rows={2}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={submitting !== null}
              onClick={() => handleAction('Approved')}
              className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting === 'Approved' ? 'Approving…' : 'Approve'}
            </button>
            <button
              type="button"
              disabled={submitting !== null}
              onClick={() => handleAction('Denied')}
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting === 'Denied' ? 'Denying…' : 'Deny'}
            </button>
            <button
              type="button"
              disabled={submitting !== null}
              onClick={() => handleAction('FlaggedRed')}
              className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting === 'FlaggedRed' ? 'Flagging…' : 'Flag red'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// The admin's own view of what's been sent to this user — previously
// invisible on this page entirely: sending a message had no track record
// here, only the user could see it (on /account). Includes every message
// regardless of origin, since free-text sends and the automatic Deny/
// FlagRed notices both land in the same Messages table.
function MessageHistorySection({ messages }: { messages: Message[] }) {
  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">Message history</h2>
      <p className="mt-1 text-xs text-slate-500">
        Everything sent to this user, including automatic notices from document decisions.
      </p>

      <div className="mt-3 space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">No messages sent yet.</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-950">{message.subject}</p>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      message.readAt ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {message.readAt ? 'Read' : 'Unread'}
                  </span>
                  <p className="text-xs text-slate-400">{formatDateTime(message.createdAt)}</p>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{message.body}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function MessageForm({ onSend }: { onSend: (subject: string, body: string) => Promise<void> }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setResult(null);
    try {
      await onSend(subject, body);
      setSubject('');
      setBody('');
      setResult("Message sent — visible in the user's account.");
    } catch {
      setResult('Failed to send — try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">Send a message</h2>
      <input
        required
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
      />
      <textarea
        required
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Message"
        rows={4}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={sending}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
        {result && <p className="text-xs text-slate-500">{result}</p>}
      </div>
    </form>
  );
}

// Admin-initiated full account deletion — mirrors the self-service
// DangerZone on /account/page.tsx (same real, complete removal, same
// two-step confirm), but reachable by the founder for cases the user
// themself can't or won't act on (e.g. a fraud-flagged account).
function DeleteUserSection({ onDelete }: { onDelete: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch {
      setError('Failed to delete this account — try again.');
      setDeleting(false);
    }
  };

  return (
    <section className="mt-6 rounded-3xl border border-red-200 bg-red-50/40 p-5">
      <h2 className="text-sm font-semibold text-red-900">Delete account</h2>
      <p className="mt-1 text-xs text-red-700">
        Permanently deletes this user&rsquo;s account, profile, and every uploaded document. This
        cannot be undone.
      </p>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-3 rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
        >
          Delete this account
        </button>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium text-red-900">Are you sure?</p>
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Yes, delete everything'}
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={() => setConfirming(false)}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}

// Best-effort name suggestion when nothing has been confirmed yet — picks a
// Passport's extracted name first (most authoritative for identity), else
// whichever document has one. Excludes documents a human already rejected
// (Denied/FlaggedRed) — those aren't a basis for suggesting real identity.
// `alreadyApproved` distinguishes two cases with different fixes: a
// still-pending document (approving it is what would confirm the name) vs.
// one approved before verified-data promotion existed, 2026-08-16 (nothing
// left to approve — needs the "Recompute" action instead).
function suggestedName(
  documents: AdminDocument[]
): { name: string; source: string; alreadyApproved: boolean } | null {
  const withName = documents.filter(
    (d) =>
      d.aiVerificationStatus === 'Completed' &&
      d.aiExtractedName &&
      d.aiExtractedName.trim().length > 0 &&
      d.reviewStatus !== 'Denied' &&
      d.reviewStatus !== 'FlaggedRed'
  );
  if (withName.length === 0) return null;
  const chosen = withName.find((d) => d.documentType === 'Passport') ?? withName[0];
  return { name: chosen.aiExtractedName as string, source: chosen.name, alreadyApproved: chosen.reviewStatus === 'Approved' };
}

type ConsistencyVerdict = 'match' | 'mismatch' | 'review';

interface ConsistencyRow {
  label: string;
  selfReported: string;
  documentValue: string;
  source: string;
  verdict: ConsistencyVerdict;
}

// Compares Level-1 self-reported answers against what each AI-reviewed
// document actually says, one row per (document, comparable field) pair.
// Structured fields (education/language level) get a real equality
// verdict; free text (nationality vs. self-reported country) only gets a
// literal case-insensitive compare, labeled "review" either way rather
// than asserting semantic sameness — same "AI proposes, human judges"
// discipline as aiNameMatchesProfile elsewhere in this pipeline.
function buildConsistencyRows(user: AdminUserDetail): ConsistencyRow[] {
  const rows: ConsistencyRow[] = [];

  for (const doc of user.documents) {
    if (doc.aiVerificationStatus !== 'Completed') continue;

    if (doc.documentType === 'EducationCertificate' && doc.aiHighestEducationLevel && user.highestEducation) {
      rows.push({
        label: 'Highest education',
        selfReported: user.highestEducation,
        documentValue: doc.aiHighestEducationLevel,
        source: doc.name,
        verdict: doc.aiHighestEducationLevel === user.highestEducation ? 'match' : 'mismatch',
      });
    }

    if (doc.documentType === 'LanguageCertificate' && doc.aiCertifiedLanguage && doc.aiCertifiedLevel) {
      const selfLevel =
        doc.aiCertifiedLanguage === 'German'
          ? user.germanLevel
          : doc.aiCertifiedLanguage === 'English'
            ? user.englishLevel
            : null;
      if (selfLevel) {
        rows.push({
          label: `${doc.aiCertifiedLanguage} level`,
          selfReported: selfLevel,
          documentValue: doc.aiCertifiedLevel,
          source: doc.name,
          verdict: selfLevel === doc.aiCertifiedLevel ? 'match' : 'mismatch',
        });
      }
    }

    if (doc.documentType === 'Passport' && doc.aiNationality && user.country) {
      rows.push({
        label: 'Country / nationality',
        selfReported: user.country,
        documentValue: doc.aiNationality,
        source: doc.name,
        verdict: doc.aiNationality.trim().toLowerCase() === user.country.trim().toLowerCase() ? 'match' : 'review',
      });
    }
  }

  return rows;
}

// Documents don't have a self-reported name to compare against (no name
// question exists in the assessment), so the useful check here is whether
// multiple documents agree with each other on the name.
function buildNameAgreement(
  documents: AdminDocument[]
): { agree: boolean; entries: { name: string; source: string }[] } | null {
  const named = documents.filter(
    (d) => d.aiVerificationStatus === 'Completed' && d.aiExtractedName && d.aiExtractedName.trim().length > 0
  );
  if (named.length < 2) return null;

  const normalized = new Set(named.map((d) => (d.aiExtractedName as string).trim().toLowerCase()));
  return {
    agree: normalized.size === 1,
    entries: named.map((d) => ({ name: d.aiExtractedName as string, source: d.name })),
  };
}

const CONSISTENCY_STYLES: Record<ConsistencyVerdict, string> = {
  match: 'bg-emerald-50 text-emerald-700',
  mismatch: 'bg-red-50 text-red-700',
  review: 'bg-amber-50 text-amber-700',
};

const CONSISTENCY_LABELS: Record<ConsistencyVerdict, string> = {
  match: 'Matches',
  mismatch: 'Different',
  review: 'Review',
};

function DataConsistencySection({ user }: { user: AdminUserDetail }) {
  const rows = buildConsistencyRows(user);
  const nameAgreement = buildNameAgreement(user.documents);

  if (rows.length === 0 && !nameAgreement) {
    return null;
  }

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">Self-reported vs. documents</h2>
      <p className="mt-1 text-xs text-slate-500">
        Comparing what the user told us against what their AI-reviewed documents actually say — a
        difference isn&rsquo;t proof of anything wrong, it just means it&rsquo;s worth a closer look.
      </p>

      <div className="mt-3 space-y-2">
        {rows.map((row, i) => (
          <div
            key={i}
            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 p-3"
          >
            <div className="text-xs text-slate-700">
              <p className="font-semibold">{row.label}</p>
              <p className="mt-0.5">
                Self-reported: <span className="font-medium">{row.selfReported}</span> · From
                &ldquo;{row.source}&rdquo;: <span className="font-medium">{row.documentValue}</span>
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${CONSISTENCY_STYLES[row.verdict]}`}>
              {CONSISTENCY_LABELS[row.verdict]}
            </span>
          </div>
        ))}

        {nameAgreement && (
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700">Name across documents</p>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  nameAgreement.agree ? CONSISTENCY_STYLES.match : CONSISTENCY_STYLES.mismatch
                }`}
              >
                {nameAgreement.agree ? 'Matches' : 'Different'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              {nameAgreement.entries.map((e) => `"${e.name}" (${e.source})`).join(' · ')}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default function AdminUserProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = params.id;

  const { adminKey, clearAdminKey } = useAdminKey();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState(false);

  const loadUser = useCallback(async () => {
    setError(null);
    try {
      const data = await getUserDetail(adminKey, userId);
      setUser(data);
    } catch (err) {
      if (err instanceof AdminUnauthorizedError) {
        clearAdminKey();
      } else {
        setError('Failed to load this user.');
      }
    }
  }, [adminKey, clearAdminKey, userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUser();
  }, [loadUser]);

  // Refetches the whole user rather than locally patching one field — a
  // review action can touch documents, verified data, the fraud flag, AND
  // (for Deny/FlagRed) message history all at once, so a full reload is
  // simpler and more correct than merging each of those by hand.
  const handleReview = async (documentId: string, request: ReviewDocumentRequest) => {
    await reviewDocument(adminKey, userId, documentId, request);
    await loadUser();
  };

  const handleSendMessage = async (subject: string, body: string) => {
    await sendMessageToUser(adminKey, userId, { subject, body });
    await loadUser();
  };

  const handleDeleteUser = async () => {
    await deleteUser(adminKey, userId);
    router.push('/admin/users/profiles');
  };

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      const updated = await recomputeVerifiedData(adminKey, userId);
      setUser(updated);
    } catch {
      setError('Failed to recompute verified data — try again.');
    } finally {
      setRecomputing(false);
    }
  };

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p className="text-sm text-red-600">{error}</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  const nameSuggestion = user.verifiedFullName ? null : suggestedName(user.documents);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <Link href="/admin/users/profiles" className="text-xs text-slate-400 hover:text-slate-600">
          ← All users
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">
              {user.verifiedFullName ?? user.fullName ?? '(no name on file)'}
              {user.verifiedFullName && (
                <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                  Verified
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-slate-600">{user.email}</p>
            {nameSuggestion && !nameSuggestion.alreadyApproved && (
              <p className="mt-1 text-xs text-amber-700">
                AI found &ldquo;{nameSuggestion.name}&rdquo; in &ldquo;{nameSuggestion.source}&rdquo; —
                not yet confirmed. Approve that document to confirm it.
              </p>
            )}
            {nameSuggestion && nameSuggestion.alreadyApproved && (
              <p className="mt-1 text-xs text-amber-700">
                &ldquo;{nameSuggestion.source}&rdquo; was approved before this could be applied to the
                profile — use &ldquo;Recompute from approved documents&rdquo; below.
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {user.fraudFlagged && (
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                Fraud-flagged{user.fraudFlagNote ? ` — ${user.fraudFlagNote}` : ''}
              </span>
            )}
            <button
              type="button"
              onClick={handleRecompute}
              disabled={recomputing}
              className="text-xs font-medium text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              {recomputing ? 'Recomputing…' : 'Recompute from approved documents'}
            </button>
          </div>
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Self-reported profile</h2>
          <dl className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="inline font-semibold">Country: </dt>
              <dd className="inline">{user.country ?? '—'}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Age: </dt>
              <dd className="inline">{user.age ?? '—'}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Highest education: </dt>
              <dd className="inline">{user.highestEducation ?? '—'}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Occupation field: </dt>
              <dd className="inline">{user.occupationField ?? '—'}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Desired path: </dt>
              <dd className="inline">{user.desiredPath ?? '—'}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">German level: </dt>
              <dd className="inline">{user.germanLevel ?? '—'}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">English level: </dt>
              <dd className="inline">{user.englishLevel ?? '—'}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Passport status: </dt>
              <dd className="inline">{user.passportStatus ?? '—'}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Financial situation: </dt>
              <dd className="inline">{user.financialSituation ?? '—'}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Start timeline: </dt>
              <dd className="inline">{user.startTimeline ?? '—'}</dd>
            </div>
          </dl>
        </section>

        {(() => {
          const allVerifiedFields: [string, string | null][] = [
            ['Full name', user.verifiedFullName],
            ['Date of birth', user.verifiedDateOfBirth],
            ['Nationality', user.verifiedNationality],
            ['Passport number', user.verifiedPassportNumber],
            ['Passport status', user.verifiedPassportStatus],
            ['Passport expiry', user.verifiedPassportExpiryDate],
            ['Highest education', user.verifiedHighestEducation],
            ['Field of study', user.verifiedFieldOfStudy],
            ['German level', user.verifiedGermanLevel],
            ['English level', user.verifiedEnglishLevel],
          ];
          const verifiedFields = allVerifiedFields.filter(([, value]) => value !== null);

          if (verifiedFields.length === 0) {
            return null;
          }

          return (
            <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50/40 p-5">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-emerald-900">Verified from documents</h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  Confirmed
                </span>
              </div>
              <p className="mt-1 text-xs text-emerald-800">
                Written when you Approved a document that contained this data.
              </p>
              <dl className="mt-3 grid grid-cols-1 gap-2 text-xs text-emerald-900 sm:grid-cols-2">
                {verifiedFields.map(([label, value]) => (
                  <div key={label}>
                    <dt className="inline font-semibold">{label}: </dt>
                    <dd className="inline">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })()}

        <DataConsistencySection user={user} />

        <section className="mt-6">
          <h2 className="text-sm font-semibold text-slate-900">Documents</h2>
          <div className="mt-3 space-y-4">
            {user.documents.length === 0 ? (
              <p className="text-sm text-slate-500">No documents uploaded yet.</p>
            ) : (
              user.documents.map((document) => (
                <DocumentCard key={document.id} document={document} onReview={handleReview} />
              ))
            )}
          </div>
        </section>

        <MessageHistorySection messages={user.messages} />

        <section className="mt-6">
          <MessageForm onSend={handleSendMessage} />
        </section>

        <DeleteUserSection onDelete={handleDeleteUser} />
      </div>
    </main>
  );
}
