'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cancelAccountDeletion, fetchMyAccount, NotSignedInError as NoAccountSession } from '@/lib/api/account';
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
  effectiveTier,
}: {
  documents: UserDocumentSummary[] | null;
  onUploaded: () => void;
  effectiveTier: EffectiveTier;
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

  // Tier1+ gate, added 2026-11-12 (tier-journey study) — document upload
  // used to be open to every signed-in user including Free, so it couldn't
  // be described as something Tier 1 buyers get. Gating only the upload
  // action (not this section's visibility, and not any document a Free
  // user already uploaded before this gate existed) turns Tier 1 into a
  // real, honest, quantifiable deliverable: "upload your documents, AI
  // checks them, then a person on our team does too" — replacing the old
  // unquantified "a real human review of your profile" marketing line.
  const canUpload = effectiveTier !== 'Free';

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">Your documents</h2>
      {canUpload ? (
        <p className="mt-1 text-xs text-slate-500">
          Self-reported, not yet verified — an AI identifies the document and does a first pass,
          then a person on our team makes the final call. Add documents one at a time. JPEG, PNG,
          or PDF, up to 10MB.
        </p>
      ) : (
        <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <p className="text-sm text-slate-700">
            Uploading documents is a Tier 1 feature — each one gets checked by AI, then reviewed
            by a real person on our team.
          </p>
          <Link
            href="/plans/tier-1"
            className="mt-2 inline-flex text-xs font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
          >
            See what Tier 1 unlocks →
          </Link>
        </div>
      )}

      {canUpload && correcting && (
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

      {canUpload && (
        <>
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
        </>
      )}

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
              {doc.reviewStatus === 'Denied' && canUpload && (
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
// I on" status itself moved out of this section entirely (2026-11-01), then
// out of this page entirely (2026-11-07 — it now lives only in the nav's
// own account menu, SiteNav's AccountNavMenu) — so this section is just the
// CollapsibleSection now, same as /matches (round 21).
function PlanSection({ effectiveTier }: { effectiveTier: EffectiveTier }) {
  return (
    <div className="space-y-4">
      {/* Tier3RequestCard stays outside the collapsible (fixed 2026-11-09,
        found by the tier-journey study — Monetization-Strategy.md §4.2b).
        It self-decides whether to show a user's own active case status (a
        live case must never be hidden behind a collapsed accordion — this
        exact bug buried "we'll reach out to schedule a conversation" from
        a real in-progress case) or, with no case yet, a single compact Gold
        pitch card — small enough on its own not to reintroduce the
        above-the-fold crowding this section's own collapse was built to
        fix. TierUpgradeOptions (Bronze/Silver, up to 2 cards) is the part
        that's purely upsell and still collapses by default. */}
      <Tier3RequestCard effectiveTier={effectiveTier} compact />
      {/* Collapsed by default (found live 2026-11-09) — this is upsell content,
        and rendering it open by default pushed the user's own profile below
        the fold on first load, the one thing /account actually exists to show. */}
      <CollapsibleSection title="Upgrade options" defaultOpen={false}>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <TierUpgradeOptions effectiveTier={effectiveTier} />
        </div>
      </CollapsibleSection>
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

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteNav />
      <section className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        {/* The tier medallion and the "Account settings" dropdown (Sign
            out/Delete account) both moved into the nav's own account menu
            (2026-11-07, see SiteNav's AccountNavMenu) — this header is just
            the page title now, not a second place for either. */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">
            Your account
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl">
            Profile, documents &amp; messages
          </h1>
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
              <DocumentsSection
                documents={documents}
                onUploaded={loadDocuments}
                effectiveTier={state.account.effectiveTier}
              />
              <MessagesTeaser effectiveTier={state.account.effectiveTier} />
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
