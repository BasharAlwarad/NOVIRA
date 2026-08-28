'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCurrentUser, RateLimitedError, requestMagicLink } from '@/lib/api/auth';
import type { ProfileSnapshot } from '@/lib/contracts/leads';

type PromptState =
  | 'checking-session'
  | 'already-signed-in'
  | 'idle'
  | 'submitting'
  | 'sent'
  | 'error'
  | 'rate-limited';

/**
 * The free account-signup boundary (Plan.md §4) — "see the actual
 * opportunities" from OpportunityCounts.tsx becomes a real, working CTA
 * here instead of a static sentence. Email-only magic link, no password
 * (see backend/Endpoints/AuthEndpoints.cs's doc comment for why). If the
 * visitor already has a session (e.g. they signed up on a previous visit),
 * this skips straight to a "View your matches" link instead of asking them
 * to sign up again.
 *
 * `profile` is sent alongside the email so the Users row this creates
 * carries the same Tier 1 profile snapshot SaveResultPrompt/OpportunityCounts
 * already use — without it, a visitor who signs up here without ever using
 * SaveResultPrompt first would get a Users row with no profile at all, and
 * /matches' hard filters would then correctly find nothing to show them.
 */
export function SignupPrompt({ profile }: { profile: ProfileSnapshot }) {
  const [state, setState] = useState<PromptState>('checking-session');
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then((user) => {
        if (!cancelled) {
          setState(user ? 'already-signed-in' : 'idle');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState('idle');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'checking-session') {
    return null;
  }

  if (state === 'already-signed-in') {
    return (
      <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5">
        <p className="text-sm font-semibold text-emerald-900">
          You&apos;re signed in — your matching opportunities are ready.
        </p>
        <Link
          href="/matches"
          className="mt-3 inline-flex h-11 items-center justify-center rounded-full bg-emerald-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          View my matches
        </Link>
      </div>
    );
  }

  if (state === 'sent') {
    return (
      <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5">
        <p className="text-sm font-semibold text-emerald-900">
          {emailSent ? 'Check your inbox' : "We couldn't send that email"}
        </p>
        <p className="mt-1 text-sm leading-6 text-emerald-800">
          {emailSent
            ? `We sent a sign-in link to ${email}. Click it to see your matching opportunities — it expires in 15 minutes.`
            : "Something went wrong sending that email — please try again in a moment."}
        </p>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState('submitting');

    try {
      const response = await requestMagicLink({ email, profile });
      setEmailSent(response.emailSent);
      setState('sent');
    } catch (error) {
      setState(error instanceof RateLimitedError ? 'rate-limited' : 'error');
    }
  };

  return (
    <div>
      <p className="text-sm font-semibold text-slate-900">
        Ready to see the actual opportunities?
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Create a free account — no password, just a sign-in link by email —
        to see the real Ausbildung and university opportunities matched to
        your profile.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Email address</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-3 text-base text-slate-900 shadow-sm shadow-slate-200/50 transition-all duration-200 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
          />
        </label>
        <button
          type="submit"
          disabled={state === 'submitting'}
          className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-400 px-6 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === 'submitting' ? 'Sending…' : 'Send me a sign-in link'}
        </button>
      </form>

      {state === 'error' && (
        <p className="mt-2 text-sm text-red-600">
          Something went wrong — please try again.
        </p>
      )}

      {state === 'rate-limited' && (
        <p className="mt-2 text-sm text-red-600">
          Too many attempts — please wait a few minutes and try again.
        </p>
      )}

      <p className="mt-3 text-xs text-slate-400">
        Self-reported answers only — not yet verified by us. No password, no
        spam, and you can request a new link any time.
      </p>
    </div>
  );
}
