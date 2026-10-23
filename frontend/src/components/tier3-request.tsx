'use client';

import { useEffect, useState } from 'react';
import { fetchMyTier3Case, requestTier3, signTier3Agreement } from '@/lib/api/tier3';
import { getTier3PaymentLink, getTier3SuccessFeePaymentLink, TIER3_SUCCESS_FEE_EUR } from '@/lib/tier-pricing';
import type { Tier3Case, Tier3CaseStatus } from '@/lib/contracts/tier3';
import type { EffectiveTier } from '@/lib/contracts/account';

const TIER3_STATUS_LABELS: Record<Tier3CaseStatus, string> = {
  Requested: "We've received your request — we'll reach out here to schedule a conversation.",
  ConsultationScheduled: 'Your consultation is scheduled — check your messages for details.',
  AgreementSigned: "Your agreement is signed — we're getting started.",
  ActiveSearch: "We're actively working on your case.",
  ApplicationSubmitted: 'Your application has been submitted.',
  Secured: 'An opportunity has been secured — check your messages for next steps.',
  Complete: 'Your case is complete.',
  // No self-service "request again" action here on purpose — the founder's
  // own call: a refund should route back through a real conversation (the
  // existing Messages channel), not a button, same as the refund itself is
  // never a self-service action anywhere in the app.
  Refunded: "This case was refunded. Message us if you'd like to talk about restarting.",
};

// The "review and sign" sub-state — between the agreement being sent
// (AgreementSentAt set) and signed (SignedAt set). Records the signature
// immediately on submit, independent of payment (see
// backend/Endpoints/Tier3Endpoints.cs's /sign-agreement comment for why
// those are two separate, sequential actions). Copy here follows the same
// novira-legal-check discipline as the rest of this file — the agreement
// text itself (server-rendered, shown verbatim below) is the one place that
// states the real authorization plainly; this surrounding UI copy doesn't
// need to repeat that.
function AgreementSigningForm({
  tier3Case,
  onSigned,
}: {
  tier3Case: Tier3Case;
  onSigned: (updated: Tier3Case) => void;
}) {
  const [fullName, setFullName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSign = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await signTier3Agreement(fullName.trim());
      onSigned(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign the agreement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">Your full-service agreement is ready</p>
      <p className="mt-1 text-sm text-slate-600">Read it below, then sign to continue to payment.</p>
      <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-700">
        {tier3Case.agreementText}
      </pre>
      <label className="mt-3 block text-xs font-semibold text-slate-600">
        Full legal name
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
        />
      </label>
      <label className="mt-3 flex items-start gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5"
        />
        I have read and agree to the terms above.
      </label>
      <button
        type="button"
        onClick={handleSign}
        disabled={submitting || !agreed || fullName.trim().length === 0}
        className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Signing…' : 'Sign agreement'}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// Tier 3's own "not self-checkout" entry point (Monetization-Strategy.md
// §4.1 item 4) — unlike Tier1/2's instant Stripe Payment Link
// (tier-upgrade-options.tsx), this just registers interest and starts a
// real conversation; the agreement and upfront payment happen later, after
// that conversation, not here (see Architecture.md's Tier 3 build-order
// sequencing — this is step 1-2 of it). Self-fetches its own case state
// (same pattern CvGenerationPanel already uses) rather than threading a new
// prop through /account's and /matches' already-large page state.
//
// Deliberately NOT gated on effectiveTier by its callers anymore (found
// 2026-10-17, Monetization-Strategy.md §4.2a: the original "only show to
// Tier2 users" gate would hide a user's own case status entirely once their
// effectiveTier actually became Tier3) — this renders unconditionally on
// every page it's placed on, and decides for itself whether to show the
// request CTA or the case status. effectiveTier is only used for the one
// edge case where someone is already Tier3 with no case on record (a state
// that shouldn't arise from the normal flow, but isn't worth showing a
// "want full-service help?" pitch to someone already paying for it).
//
// Copy checked against novira-legal-check: "help you complete and submit
// your application," never "we apply on your behalf" — Legal.md §1's
// wording discipline applies to Tier 3's own copy specifically, even though
// the underlying service does involve submitting under signed authorization
// later on (the discipline is about what's said, not what's eventually
// done).
export function Tier3RequestCard({ effectiveTier }: { effectiveTier: EffectiveTier }) {
  const [tier3Case, setTier3Case] = useState<Tier3Case | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyTier3Case()
      .then((result) => {
        setTier3Case(result);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return null;
  }

  if (tier3Case) {
    // Awaiting signature — the agreement's been sent but not yet signed.
    if (tier3Case.agreementSentAt && !tier3Case.signedAt) {
      return <AgreementSigningForm tier3Case={tier3Case} onSigned={setTier3Case} />;
    }

    // Signed, awaiting payment — status only reaches AgreementSigned once
    // payment is also verified (PurchasesEndpoints.cs), so "signed but
    // status is still ConsultationScheduled" is exactly this sub-state.
    if (tier3Case.signedAt && tier3Case.status === 'ConsultationScheduled' && tier3Case.upfrontAmountEur) {
      const paymentLink = getTier3PaymentLink(tier3Case.upfrontAmountEur);
      return (
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Agreement signed — one step left</p>
          <p className="mt-1 text-sm text-slate-600">
            Pay the upfront fee (€{tier3Case.upfrontAmountEur}) to get started.
          </p>
          {paymentLink ? (
            <a
              href={paymentLink}
              className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-emerald-500 px-5 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              Pay €{tier3Case.upfrontAmountEur}
            </a>
          ) : (
            <p className="mt-2 text-xs text-red-600">
              Payment isn&apos;t set up yet for this amount — contact us via Messages.
            </p>
          )}
        </div>
      );
    }

    // Secured, success fee requested, not yet paid — no new agreement or
    // signature needed here, the already-signed agreement's own Section 3/4
    // already covers this fee (see Tier3AgreementTemplate.cs).
    if (tier3Case.status === 'Secured' && tier3Case.successFeeRequestedAt && !tier3Case.successFeePaidAt) {
      const successFeeLink = getTier3SuccessFeePaymentLink();
      return (
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Congratulations — your opportunity is secured!</p>
          <p className="mt-1 text-sm text-slate-600">
            The final success fee (€{TIER3_SUCCESS_FEE_EUR}) is now due, as agreed in your signed agreement.
          </p>
          {successFeeLink ? (
            <a
              href={successFeeLink}
              className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-emerald-500 px-5 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              Pay €{TIER3_SUCCESS_FEE_EUR}
            </a>
          ) : (
            <p className="mt-2 text-xs text-red-600">
              Payment isn&apos;t set up yet — contact us via Messages.
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Your full-service request</p>
        <p className="mt-1 text-sm text-slate-600">{TIER3_STATUS_LABELS[tier3Case.status]}</p>
        {tier3Case.targetOpportunityTitle && (
          <p className="mt-1 text-xs text-slate-500">
            {tier3Case.targetOpportunityTitle}
            {tier3Case.targetOpportunityProvider ? ` — ${tier3Case.targetOpportunityProvider}` : ''}
          </p>
        )}
      </div>
    );
  }

  if (effectiveTier === 'Tier3') {
    return null;
  }

  const handleRequest = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await requestTier3();
      setTier3Case(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send your request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900 p-4">
      <p className="text-sm font-semibold text-white">Want full-service help?</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        We&apos;ll help you complete and submit your application, start to finish, under a signed
        agreement — including a real conversation first, so you know exactly what&apos;s involved
        before anything is decided.
      </p>
      <button
        type="button"
        onClick={handleRequest}
        disabled={submitting}
        className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Sending…' : 'Request full-service help'}
      </button>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      <p className="mt-3 text-xs text-slate-400">
        No payment or commitment yet — we&apos;ll reach out to schedule a conversation.
      </p>
    </div>
  );
}
