'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cancelAccountDeletion, fetchMyAccount, NotSignedInError as NoAccountSession } from '@/lib/api/account';
import { logout } from '@/lib/api/auth';
import { listMyDocuments, uploadDocument } from '@/lib/api/documents';
import { verifyCheckoutSession } from '@/lib/api/purchases';
import { fetchMyIntake } from '@/lib/api/intake';
import type { Account, EffectiveTier } from '@/lib/contracts/account';
import type { UserDocumentSummary } from '@/lib/contracts/documents';
import type { IntakeStatus } from '@/lib/contracts/intake';
import type { PurchaseTier } from '@/lib/contracts/purchases';
import { TierUpgradeOptions } from '@/components/tier-upgrade-options';
import { Tier3RequestCard } from '@/components/tier3-request';
import { SiteFooter } from '@/components/site-footer';
import { SiteNav } from '@/components/site-nav';

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
    ['Occupation field', account.verifiedOccupationField],
    ['German level', account.verifiedGermanLevel],
    ['English level', account.verifiedEnglishLevel],
    // A boolean, not a value to display as-is — only shown once true (a
    // false/absent certificate isn't "verified data," just nothing yet).
    ['Certified language proof', account.verifiedHasCertifiedLanguageProof ? 'Yes' : null],
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

const INTAKE_STATUS_LABELS: Record<IntakeStatus, string> = {
  NotStarted: 'Not started yet',
  InProgress: "In progress — pick up where you left off",
  Submitted: 'Submitted for review',
};

// Promoted to a real card near the top of the page (2026-10-01) — was a
// small text link at the bottom, which the founder correctly flagged as
// easy to miss and a poor way to advertise a real feature. `status` is
// fetched best-effort alongside the rest of the page; a `null` (fetch
// failed, or hasn't resolved yet) still renders the card with the
// not-started copy rather than hiding it, since the link itself works
// regardless of whether the status fetch succeeded.
function CvProfileSection({ status }: { status: IntakeStatus | null }) {
  const effectiveStatus = status ?? 'NotStarted';
  return (
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-emerald-900">CV profile</h2>
          <p className="mt-1 text-sm leading-6 text-emerald-800">
            Your work history, education detail, and skills — filled in once, used to build a
            tailored CV whenever you request one for a specific match.
          </p>
          <p className="mt-2 text-xs font-semibold text-emerald-700">
            Status: {INTAKE_STATUS_LABELS[effectiveStatus]}
          </p>
        </div>
        <Link
          href="/account/intake"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-emerald-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          {effectiveStatus === 'NotStarted' ? 'Build your CV profile' : 'Edit your CV profile'}
        </Link>
      </div>
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


const TIER_LABELS: Record<EffectiveTier, string> = {
  Free: 'Free',
  Tier1: 'Tier 1 — Unlock all matches',
  Tier2: 'Tier 2 — Application support',
  Tier3: 'Tier 3 — Full service',
};

// "Where the user unlocks... shows what tier or level he is on and what can
// he unlock" — the founder's own framing for where this belongs. Tier 2's
// upsell (added 2026-09-29) deliberately describes only what the tier IS
// (Monetization-Strategy.md §4.1's real scope), not how it's delivered —
// the CV-generation system and interview-booking mechanism aren't built
// yet, same "sell the defined tier, fulfill it manually for now" precedent
// Tier 1's own still-manual "human review" already set. Wording checked
// against Legal.md/novira-legal-check: "help you prepare/apply," never
// "we apply for you" (that's Tier 3's line), no outcome guarantees.
function PlanSection({ effectiveTier }: { effectiveTier: EffectiveTier }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">Your plan</h2>
      <p className="mt-1 text-sm font-medium text-slate-700">{TIER_LABELS[effectiveTier]}</p>

      <div className="mt-4 space-y-3">
        <TierUpgradeOptions effectiveTier={effectiveTier} />
        <Tier3RequestCard effectiveTier={effectiveTier} />
      </div>
    </section>
  );
}

// Replaces the old always-visible "Delete account" red box (point 10 of the
// 2026-10-04 UI/UX hardening pass) — the founder explicitly didn't want
// deletion to be this obvious/easy to stumble into. Tucked into a dropdown
// alongside Sign out instead, with "Delete account" styled distinctly
// within that menu, not as its own loud section. The actual deletion flow
// (reason, email confirmation, 7-day cooling-off) lives at /account/delete.
function AccountMenu({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600"
      >
        Account settings
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-[0_16px_48px_rgba(15,23,42,0.12)]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
          <Link
            href="/account/delete"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            Delete account
          </Link>
        </div>
      )}
    </div>
  );
}

function formatFullDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Shown instead of banner-and-continue — found while building this: the
// backend doesn't actually block normal account access during the 7-day
// window (only the eventual sweep enforces anything), so this is honest
// communication + a fast path to cancel, not a hard gate. The rest of the
// page still renders beneath it, same "stays reachable for cancellation"
// shape the research behind this flow described.
function PendingDeletionBanner({ scheduledFor }: { scheduledFor: string }) {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    setCancelling(true);
    setError(null);
    try {
      await cancelAccountDeletion();
      window.location.reload();
    } catch {
      setError('Failed to cancel — try again.');
      setCancelling(false);
    }
  };

  return (
    <section className="rounded-3xl border border-red-200 bg-red-50/60 p-5">
      <h2 className="text-sm font-semibold text-red-900">Account scheduled for deletion</h2>
      <p className="mt-1 text-sm leading-6 text-red-800">
        Your account will be permanently deleted on <strong>{formatFullDate(scheduledFor)}</strong>.
        Changed your mind?
      </p>
      <button
        type="button"
        onClick={handleCancel}
        disabled={cancelling}
        className="mt-3 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {cancelling ? 'Cancelling…' : 'Cancel deletion, keep my account'}
      </button>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </section>
  );
}

// Collapses the CV profile and self-reported profile into tabs (point 6 of
// the 2026-10-04 UI/UX hardening pass) — the founder's own complaint:
// having both as big, always-expanded cards reads as confusing/redundant,
// especially once a user is paying for the CV service. The fix that was
// agreed is purely this — visual decluttering — not a backend field lock:
// checked the self-report model and found it never even collects true
// identity facts (name/DOB/nationality/passport number) in the first
// place, so there's nothing there to protect that isn't already protected
// by simply not existing as a self-edit path. Verified data stays paired
// with the Profile tab, since it's the confirmed version of the same
// fields, not a third separate concern.
function ProfileTabs({ account, intakeStatus }: { account: Account; intakeStatus: IntakeStatus | null }) {
  const [tab, setTab] = useState<'cv' | 'profile'>('cv');

  return (
    <div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('cv')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === 'cv' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          CV profile
        </button>
        <button
          type="button"
          onClick={() => setTab('profile')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === 'profile' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Your profile
        </button>
      </div>

      <div className="mt-4 space-y-6">
        {tab === 'cv' && <CvProfileSection status={intakeStatus} />}
        {tab === 'profile' && (
          <>
            <ProfileSection account={account} />
            <VerifiedSection account={account} />
          </>
        )}
      </div>
    </div>
  );
}

// Messages moved to their own route (point 7 of the 2026-10-04 UI/UX
// hardening pass) — this is just a short teaser card linking there, not the
// conversation itself (that lives in MessagesPanel, shared with the
// floating contact drawer). Keeps /account from needing its own
// fetch/poll/live-push wiring for messages at all anymore.
function MessagesTeaser({ effectiveTier }: { effectiveTier: EffectiveTier }) {
  const canReply = effectiveTier === 'Tier2' || effectiveTier === 'Tier3';
  return (
    <Link
      href="/account/messages"
      className="block rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-emerald-300"
    >
      <h2 className="text-sm font-semibold text-slate-900">Messages</h2>
      <p className="mt-1 text-xs text-slate-500">
        {canReply
          ? 'Live chat with our team — replies arrive instantly.'
          : 'Updates from our team — document decisions and anything else we send you land here.'}
      </p>
      <p className="mt-3 text-sm font-semibold text-emerald-700">Open messages →</p>
    </Link>
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
  const [intakeStatus, setIntakeStatus] = useState<IntakeStatus | null>(null);
  const [justUpdated, setJustUpdated] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState<{ text: string; isError: boolean } | null>(
    null
  );

  const loadDocuments = useCallback(() => {
    listMyDocuments()
      .then(setDocuments)
      .catch(() => {
        // The account fetch below already surfaces sign-in/error state;
        // a failed document list on its own just leaves the section empty.
      });
  }, []);

  const loadIntakeStatus = useCallback(() => {
    fetchMyIntake()
      .then((response) => setIntakeStatus(response.profile?.status ?? 'NotStarted'))
      .catch(() => {
        // Best-effort, same reasoning as loadDocuments/loadMessages above —
        // CvProfileSection just falls back to its default "not started"
        // copy rather than the page failing to load (the lesson from the
        // /matches CV-requests bug found live 2026-10-01).
      });
  }, []);

  useEffect(() => {
    fetchMyAccount()
      .then((account) => {
        setState({ status: 'loaded', account });
        loadDocuments();
        loadIntakeStatus();
      })
      .catch((error) => {
        setState({ status: error instanceof NoAccountSession ? 'not-signed-in' : 'error' });
      });
  }, [loadDocuments, loadIntakeStatus]);

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

  // Lands here from a Stripe Payment Link's "after payment" redirect
  // (configured per-tier in the Stripe dashboard, not in this app) —
  // ?checkout_session={CHECKOUT_SESSION_ID}. Verified server-side before any
  // access is granted (see PurchasesEndpoints.cs's comment on why this
  // exists instead of a webhook). The tier itself comes from a &tier=
  // param on the redirect URL, defaulting to Tier1 for backward
  // compatibility with the existing Tier 1 Payment Link (created before
  // this param existed) — any newly created Payment Link (Tier2+) should
  // include &tier=Tier2 etc. in its configured redirect URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('checkout_session');
    if (!sessionId) return;

    const tierParam = params.get('tier');
    const tier: PurchaseTier = tierParam === 'Tier2' || tierParam === 'Tier3' ? tierParam : 'Tier1';

    router.replace('/account');

    verifyCheckoutSession({ tier, sessionId })
      .then((result) => {
        setCheckoutMessage({
          text: result.alreadyProcessed
            ? `Payment already confirmed — you're on ${TIER_LABELS[result.effectiveTier]}.`
            : `Payment confirmed — you're on ${TIER_LABELS[result.effectiveTier]}.`,
          isError: false,
        });
        return fetchMyAccount();
      })
      .then((account) => {
        if (account) {
          setState({ status: 'loaded', account });
        }
      })
      .catch((err) => {
        setCheckoutMessage({
          text: err instanceof Error ? err.message : 'Could not verify your payment.',
          isError: true,
        });
      });
  }, [router]);

  const handleLogout = async () => {
    await logout();
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
          {state.status === 'loaded' && <AccountMenu onLogout={handleLogout} />}
        </div>

        {state.status === 'loaded' && (
          <p className="mt-2 text-sm text-slate-600">{state.account.email}</p>
        )}

        {justUpdated && (
          <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
            Profile updated.
          </p>
        )}

        {checkoutMessage && (
          <p
            className={`mt-4 rounded-2xl px-4 py-2.5 text-sm font-medium ${
              checkoutMessage.isError
                ? 'bg-red-50 text-red-800'
                : 'bg-emerald-50 text-emerald-800'
            }`}
          >
            {checkoutMessage.text}
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
              {state.account.deletionScheduledFor && (
                <PendingDeletionBanner scheduledFor={state.account.deletionScheduledFor} />
              )}
              {!state.account.profileUpdatedAt && <NoProfileBanner />}
              <PlanSection effectiveTier={state.account.effectiveTier} />
              <ProfileTabs account={state.account} intakeStatus={intakeStatus} />
              <DocumentsSection documents={documents} onUploaded={loadDocuments} />
              <MessagesTeaser effectiveTier={state.account.effectiveTier} />
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
