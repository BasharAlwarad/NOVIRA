'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cancelAccountDeletion, fetchMyAccount, NotSignedInError as NoAccountSession } from '@/lib/api/account';
import { logout } from '@/lib/api/auth';
import { listMyDocuments, uploadDocument } from '@/lib/api/documents';
import { listMyMessages } from '@/lib/api/messages';
import { verifyCheckoutSession } from '@/lib/api/purchases';
import { verifySuccessFeeSession } from '@/lib/api/tier3';
import type { Account, EffectiveTier } from '@/lib/contracts/account';
import type { UserDocumentSummary } from '@/lib/contracts/documents';
import type { PurchaseTier } from '@/lib/contracts/purchases';
import { TierUpgradeOptions } from '@/components/tier-upgrade-options';
import { Tier3RequestCard } from '@/components/tier3-request';
import { CollapsibleSection } from '@/components/collapsible-section';
import { CurrentTierBadge } from '@/components/current-tier-badge';
import { EditableProfileSection } from '@/components/editable-profile-section';
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
          // Explicit disabled colors instead of opacity-50 — opacity faded
          // both the emerald bg and near-black text toward white together,
          // landing around 3:1 contrast (fails WCAG AA's 4.5:1 for this
          // text size). slate-200/slate-600 reads clearly as inactive
          // while staying legible (~5:1).
          className="w-full rounded-full bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600"
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


// Plain-text labels for toast/confirmation copy (e.g. "Payment confirmed —
// you're on Tier 2 — Application support.").
const TIER_LABELS: Record<EffectiveTier, string> = {
  Free: 'Free',
  Tier1: 'Tier 1 — Unlock all matches',
  Tier2: 'Tier 2 — Application support',
  Tier3: 'Tier 3 — Full service',
};

// Tier 2's upsell (added 2026-09-29) deliberately describes only what the
// tier IS (Monetization-Strategy.md §4.1's real scope), not how it's
// delivered — the CV-generation system and interview-booking mechanism
// aren't built yet, same "sell the defined tier, fulfill it manually for
// now" precedent Tier 1's own still-manual "human review" already set.
// Wording checked against Legal.md/novira-legal-check: "help you
// prepare/apply," never "we apply for you" (that's Tier 3's line), no
// outcome guarantees.
//
// Round 6: the upgrade cards below switch to `compact` — the exact same
// gradient/medallion/star card component /matches uses, replacing the old
// plain stacked green boxes this section used to render. The "what plan am
// I on" status itself moved out of this section entirely (2026-11-01) —
// see CurrentTierBadge, now a small pill under the page header's "Account
// settings" dropdown instead of a full-width banner here — so this section
// is just the CollapsibleSection now, same as /matches (round 21).
function PlanSection({ effectiveTier }: { effectiveTier: EffectiveTier }) {
  return (
    <CollapsibleSection title="Upgrade options">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TierUpgradeOptions effectiveTier={effectiveTier} />
        <Tier3RequestCard effectiveTier={effectiveTier} compact />
      </div>
    </CollapsibleSection>
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

// Messages moved to their own route (point 7 of the 2026-10-04 UI/UX
// hardening pass) — this is just a short teaser card linking there, not the
// conversation itself (that lives in MessagesPanel, shared with the
// floating contact drawer). Deliberately still no poll/live-push wiring
// here (that stays SiteNav's job) — just one fetch on mount to show whether
// there's anything new, since the nav already tracks this but a user has to
// notice a small dot there before clicking through twice to find out.
function MessagesTeaser({ effectiveTier }: { effectiveTier: EffectiveTier }) {
  const canReply = effectiveTier === 'Tier2' || effectiveTier === 'Tier3';
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    listMyMessages()
      .then((messages) => setHasUnread(messages.some((message) => message.readAt === null)))
      .catch(() => {});
  }, []);

  return (
    <Link
      href="/account/messages"
      className="block rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-emerald-300"
    >
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Messages</h2>
        {hasUnread && (
          <span className="h-2 w-2 rounded-full bg-emerald-400" aria-label="New message" />
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {canReply
          ? 'Live chat with our team — replies arrive instantly.'
          : 'Updates from our team — document decisions and anything else we send you land here.'}
      </p>
      <p className="mt-3 text-sm font-semibold text-emerald-700">
        {hasUnread ? 'You have new messages →' : 'Open messages →'}
      </p>
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

  useEffect(() => {
    fetchMyAccount()
      .then((account) => {
        setState({ status: 'loaded', account });
        loadDocuments();
      })
      .catch((error) => {
        setState({ status: error instanceof NoAccountSession ? 'not-signed-in' : 'error' });
      });
  }, [loadDocuments]);

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

  // The Tier 3 success-fee Payment Link's own redirect — a deliberately
  // distinct query param (success_fee_session) from the checkout_session
  // effect above, so the two can never be confused with each other. Doesn't
  // need to re-fetch the whole account (unlike the tier-unlock case above),
  // since the success fee doesn't change effectiveTier — only the Tier 3
  // case itself, which Tier3RequestCard already self-fetches.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('success_fee_session');
    if (!sessionId) return;

    router.replace('/account');

    verifySuccessFeeSession(sessionId)
      .then(() => {
        setCheckoutMessage({ text: 'Success fee payment confirmed — your case is complete.', isError: false });
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
          {state.status === 'loaded' && (
            <div className="flex flex-col items-end gap-2">
              <AccountMenu onLogout={handleLogout} />
              <CurrentTierBadge effectiveTier={state.account.effectiveTier} />
            </div>
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
              <EditableProfileSection account={state.account} />
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
