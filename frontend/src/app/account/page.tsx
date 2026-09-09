'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteMyAccount, fetchMyAccount, NotSignedInError as NoAccountSession } from '@/lib/api/account';
import { logout } from '@/lib/api/auth';
import { listMyDocuments, uploadDocument } from '@/lib/api/documents';
import { listMyMessages, markAllMessagesRead } from '@/lib/api/messages';
import type { Account } from '@/lib/contracts/account';
import type { UserDocumentSummary } from '@/lib/contracts/documents';
import type { Message } from '@/lib/contracts/messages';
import { usePolling } from '@/hooks/usePolling';
import { SiteFooter } from '@/components/site-footer';
import { SiteNav } from '@/components/site-nav';

// How often to check for new messages while this page is open — see
// CLAUDE.md's messaging entry for why polling was chosen over WebSockets/
// SSE for this feature.
const MESSAGE_POLL_INTERVAL_MS = 20_000;

function documentTypeLabel(type: UserDocumentSummary['documentType']): string {
  if (type === null) return 'Type not yet determined';
  return type.replace(/([a-z])([A-Z])/g, '$1 $2');
}

const STATUS_STYLES: Record<UserDocumentSummary['reviewStatus'], string> = {
  PendingReview: 'bg-amber-50 text-amber-700',
  Approved: 'bg-emerald-50 text-emerald-700',
  Denied: 'bg-slate-100 text-slate-600',
  FlaggedRed: 'bg-red-50 text-red-700',
};

function statusLabel(status: UserDocumentSummary['reviewStatus']): string {
  switch (status) {
    case 'PendingReview':
      return 'Under review';
    case 'Approved':
      return 'Approved';
    case 'Denied':
      return 'Needs another look';
    case 'FlaggedRed':
      return 'Needs attention';
  }
}

// Shown only for an account with no profile yet — i.e. someone who signed
// up directly via /signin without ever completing the assessment (see
// CLAUDE.md's "Sign-up UX" entry, 2026-08-28). Without this, ProfileSection
// below would just be ten "—" placeholders with no explanation, which reads
// as broken rather than as a genuinely empty, expected state.
function NoProfileBanner() {
  return (
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-5">
      <h2 className="text-sm font-semibold text-emerald-900">Welcome to NOVIRA</h2>
      <p className="mt-1 text-sm leading-6 text-emerald-800">
        You don&apos;t have a profile yet — that&apos;s fine, you can start uploading documents
        right away below. For matched opportunities tailored to your situation, take the free
        assessment whenever you&apos;re ready.
      </p>
      <Link
        href="/assessment"
        className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-emerald-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
      >
        Take the assessment
      </Link>
    </section>
  );
}

function ProfileSection({ account }: { account: Account }) {
  const fields: [string, string | null][] = [
    ['Country', account.country],
    ['Age', account.age],
    ['Highest education', account.highestEducation],
    ['Occupation field', account.occupationField],
    ['Desired path', account.desiredPath],
    ['German level', account.germanLevel],
    ['English level', account.englishLevel],
    ['Passport status', account.passportStatus],
    ['Financial situation', account.financialSituation],
    ['Start timeline', account.startTimeline],
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Your profile</h2>
          <p className="mt-1 text-xs text-slate-500">
            Self-reported from your assessment — not yet independently verified.
          </p>
        </div>
        <Link
          href="/assessment/edit"
          className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Edit my profile
        </Link>
      </div>
      <dl className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt className="inline font-semibold">{label}: </dt>
            <dd className="inline">{value ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// Only rendered when at least one Verified* field is set — populated once
// an admin approves a document that contained it (Level 3 of the four-level
// model, see backend/Models/User.cs). Styled distinctly from ProfileSection
// above (which stays "not yet independently verified", scoped correctly to
// the self-reported fields only).
function VerifiedSection({ account }: { account: Account }) {
  const allFields: [string, string | null][] = [
    ['Full name', account.verifiedFullName],
    ['Date of birth', account.verifiedDateOfBirth],
    ['Nationality', account.verifiedNationality],
    ['Passport number', account.verifiedPassportNumber],
    ['Passport status', account.verifiedPassportStatus],
    ['Passport expiry', account.verifiedPassportExpiryDate],
    ['Highest education', account.verifiedHighestEducation],
    ['Field of study', account.verifiedFieldOfStudy],
    ['German level', account.verifiedGermanLevel],
    ['English level', account.verifiedEnglishLevel],
  ];
  const fields = allFields.filter(([, value]) => value !== null);

  if (fields.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-5">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-emerald-900">Verified from your documents</h2>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
          Confirmed
        </span>
      </div>
      <p className="mt-1 text-xs text-emerald-800">
        Confirmed by our team from a document you uploaded — used to find better matches.
      </p>
      <dl className="mt-4 grid grid-cols-1 gap-2 text-xs text-emerald-900 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt className="inline font-semibold">{label}: </dt>
            <dd className="inline">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// One document at a time, deliberately: name it, pick the file, upload —
// no batch fields, no dropdown (the AI determines the type from the
// document itself, see backend/Models/UserDocument.cs's comment). Every
// field stacks vertically and stays within the card's own width, so the
// submit button can never overflow the container the way the old
// horizontal layout did.
function DocumentsSection({
  documents,
  onUploaded,
}: {
  documents: UserDocumentSummary[] | null;
  onUploaded: () => void;
}) {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Set by clicking "Upload a corrected version" on a Denied document below
  // — self-service document correction, built 2026-08-30. Re-upload itself
  // always worked (no limit on adding a new document); what was missing was
  // an explicit link from the new upload back to what it's fixing, so the
  // admin doesn't have to match two unrelated-looking rows by eye.
  const [correcting, setCorrecting] = useState<UserDocumentSummary | null>(null);

  const startCorrection = (doc: UserDocumentSummary) => {
    setCorrecting(doc);
    setName(doc.name);
    setMessage(null);
  };

  const cancelCorrection = () => {
    setCorrecting(null);
    setName('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !name.trim()) return;

    setSubmitting(true);
    setMessage(null);
    try {
      await uploadDocument(file, name.trim(), correcting?.id);
      setFile(null);
      setName('');
      setMessage(
        correcting
          ? "Corrected version uploaded — it's being reviewed now."
          : "Uploaded — it's being reviewed now."
      );
      setCorrecting(null);
      onUploaded();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Upload failed — try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">Your documents</h2>
      <p className="mt-1 text-xs text-slate-500">
        Self-reported, not yet verified — an AI identifies the document and does a first pass,
        then a person on our team makes the final call. Add documents one at a time. JPEG, PNG,
        or PDF, up to 10MB.
      </p>

      {correcting && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          <span>
            Uploading a corrected version of <strong>{correcting.name}</strong>.
          </span>
          <button
            type="button"
            onClick={cancelCorrection}
            className="shrink-0 font-semibold underline underline-offset-2 hover:text-amber-900"
          >
            Cancel
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 flex w-full flex-col gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name this document (e.g. My passport)"
          maxLength={200}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
        />
        <input
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 file:mr-3 file:rounded-full file:border-0 file:bg-emerald-400 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-950"
        />
        <button
          type="submit"
          disabled={!file || !name.trim() || submitting}
          className="w-full rounded-full bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Uploading…' : 'Upload document'}
        </button>
      </form>
      {message && <p className="mt-2 text-xs text-slate-500">{message}</p>}

      <div className="mt-4 space-y-3">
        {documents === null ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-slate-500">No documents uploaded yet.</p>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{doc.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{documentTypeLabel(doc.documentType)}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[doc.reviewStatus]}`}
                >
                  {statusLabel(doc.reviewStatus)}
                </span>
              </div>
              {doc.reviewNote && doc.reviewStatus !== 'Approved' && (
                <p className="mt-2 text-xs text-slate-500">{doc.reviewNote}</p>
              )}
              {doc.reviewStatus === 'Denied' && (
                <button
                  type="button"
                  onClick={() => startCorrection(doc)}
                  className="mt-2 text-xs font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
                >
                  Upload a corrected version
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function formatMessageDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Read state is page-level, not per-message (see the comment on the backend
// endpoint) — the unread dot reflects the snapshot from when this section
// loaded and won't reappear until a genuinely new message arrives on a
// future visit.
function MessagesSection({ messages }: { messages: Message[] | null }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">Messages</h2>
      <p className="mt-1 text-xs text-slate-500">
        Updates from our team — document decisions and anything else we send you land here.
      </p>

      <div className="mt-4 space-y-3">
        {messages === null ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-slate-500">No messages yet.</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  {message.readAt === null && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-label="Unread" />
                  )}
                  {message.subject}
                </p>
                <p className="shrink-0 text-xs text-slate-400">{formatMessageDateTime(message.createdAt)}</p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{message.body}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function DangerZone({ onDeleted }: { onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteMyAccount();
      onDeleted();
    } catch {
      setError('Failed to delete your account — try again.');
      setDeleting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-red-200 bg-red-50/40 p-5">
      <h2 className="text-sm font-semibold text-red-900">Delete account</h2>
      <p className="mt-1 text-xs text-red-700">
        Permanently deletes your account, profile, and every uploaded document. This cannot be
        undone.
      </p>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-3 rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
        >
          Delete my account
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
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </section>
  );
}

type PageState =
  | { status: 'loading' }
  | { status: 'not-signed-in' }
  | { status: 'error' }
  | { status: 'loaded'; account: Account };

export default function AccountPage() {
  const router = useRouter();
  const [state, setState] = useState<PageState>({ status: 'loading' });
  const [documents, setDocuments] = useState<UserDocumentSummary[] | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [justUpdated, setJustUpdated] = useState(false);

  const loadDocuments = useCallback(() => {
    listMyDocuments()
      .then(setDocuments)
      .catch(() => {
        // The account fetch below already surfaces sign-in/error state;
        // a failed document list on its own just leaves the section empty.
      });
  }, []);

  const loadMessages = useCallback(() => {
    listMyMessages()
      .then((data) => {
        setMessages(data);
        // Viewing this page is what "read" means in this first pass — see
        // the comment on MessagesEndpoints.cs's POST /read-all. Fire-and-
        // forget: a failure here just means the unread dot persists until
        // the next successful visit, not worth surfacing as an error.
        if (data.some((message) => message.readAt === null)) {
          markAllMessagesRead().catch(() => {});
        }
      })
      .catch(() => {
        // Same reasoning as loadDocuments above.
      });
  }, []);

  useEffect(() => {
    fetchMyAccount()
      .then((account) => {
        setState({ status: 'loaded', account });
        loadDocuments();
        loadMessages();
      })
      .catch((error) => {
        setState({ status: error instanceof NoAccountSession ? 'not-signed-in' : 'error' });
      });
  }, [loadDocuments, loadMessages]);

  // Landed here from /assessment/edit's redirectTo="/account?updated=1" —
  // read directly off window.location rather than useSearchParams() to
  // avoid needing a <Suspense> boundary just for this. Cleared from the URL
  // immediately so a refresh doesn't keep re-showing the banner.
  useEffect(() => {
    // One-time sync from an external, client-only source (the URL) on
    // mount — same pattern as assessment/result/page.tsx's own load.
    if (new URLSearchParams(window.location.search).get('updated') === '1') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJustUpdated(true);
      router.replace('/account');
    }
  }, [router]);

  // A new message won't otherwise appear until the page is manually
  // reloaded — this is what actually fixes that, without the complexity of
  // a real push mechanism (WebSockets/SSE) for what's just asynchronous
  // notifications, not live chat.
  usePolling(loadMessages, MESSAGE_POLL_INTERVAL_MS, state.status === 'loaded');

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleDeleted = () => {
    router.push('/');
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteNav />
      <section className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">
              Your account
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl">
              Profile, documents &amp; messages
            </h1>
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

        {state.status === 'loaded' && (
          <p className="mt-2 text-sm text-slate-600">{state.account.email}</p>
        )}

        {justUpdated && (
          <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
            Profile updated.
          </p>
        )}

        <div className="mt-8 space-y-6">
          {state.status === 'loading' && <p className="text-sm text-slate-500">Loading…</p>}

          {state.status === 'not-signed-in' && (
            <div className="rounded-4xl border border-slate-200 bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              <p className="text-sm text-slate-600">
                You&apos;re not signed in, or your sign-in link has expired.
              </p>
              <Link
                href="/signin"
                className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-emerald-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Sign in
              </Link>
            </div>
          )}

          {state.status === 'error' && (
            <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              We couldn&apos;t load your account right now. Please try again shortly.
            </p>
          )}

          {state.status === 'loaded' && (
            <>
              {!state.account.profileUpdatedAt && <NoProfileBanner />}
              <ProfileSection account={state.account} />
              <VerifiedSection account={state.account} />
              <DocumentsSection documents={documents} onUploaded={loadDocuments} />
              <MessagesSection messages={messages} />
              <div className="pt-2">
                <Link href="/matches" className="text-sm text-emerald-700 underline underline-offset-2">
                  View my matching opportunities →
                </Link>
              </div>
              <DangerZone onDeleted={handleDeleted} />
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
