'use client';

import { useEffect, useState } from 'react';
import { fetchMyTier3Case, requestTier3 } from '@/lib/api/tier3';
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
