'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCurrentUser, RateLimitedError, requestMagicLink } from '@/lib/api/auth';
import { SiteFooter } from '@/components/site-footer';
import { SiteNav } from '@/components/site-nav';

type PageState =
  | 'checking-session'
  | 'already-signed-in'
  | 'idle'
  | 'submitting'
  | 'sent'
  | 'error'
  | 'rate-limited';

// The standalone sign-in / sign-up entry point. Originally closed a real
// gap (found 2026-08-28): the only other place that could request a magic
// link (SignupPrompt.tsx) only renders on /assessment/result, which itself
// hard-requires a saved assessment in localStorage — a returning user on a
// new device, or one who'd cleared their browser data, had no way back in
// short of redoing the entire 14-question assessment.
//
// Deliberately also serves brand-new users (2026-08-28 decision, see
// CLAUDE.md's "Sign-up UX" entry) — there's no meaningful backend
// distinction between "signup" and "signin" when there's no password, so
// one page and one form correctly handles both: someone who already knows
// about NOVIRA can create an account and start uploading documents
// immediately, without the assessment funnel. No `profile` is sent (there
// may be no local assessment data at all), which is safe either way:
// /auth/verify only overwrites the stored profile when one is actually
// provided, so an existing account's data is left untouched.
export default function SignInPage() {
  const [state, setState] = useState<PageState>('checking-session');
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then((user) => {
        if (!cancelled) {
          setHasProfile(user?.hasProfile ?? false);
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState('submitting');

    try {
      const response = await requestMagicLink({ email });
      setEmailSent(response.emailSent);
      setState('sent');
    } catch (error) {
      setState(error instanceof RateLimitedError ? 'rate-limited' : 'error');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteNav />
      <section className="mx-auto w-full max-w-md px-4 py-20 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">
          Sign in or sign up
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl">
          One email, no password
        </h1>

        {state === 'checking-session' && (
          <p className="mt-6 text-sm text-slate-500">Checking your session…</p>
        )}

        {state === 'already-signed-in' && (
          <div className="mt-6 rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5">
            <p className="text-sm font-semibold text-emerald-900">
              You&apos;re already signed in.
            </p>
            <Link
              href={hasProfile ? '/matches' : '/account'}
              className="mt-3 inline-flex h-11 items-center justify-center rounded-full bg-emerald-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              {hasProfile ? 'View my matches' : 'Go to my account'}
            </Link>
          </div>
        )}

        {state === 'sent' && (
          <div className="mt-6 rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5">
            <p className="text-sm font-semibold text-emerald-900">
              {emailSent ? 'Check your inbox' : "We couldn't send that email"}
            </p>
            <p className="mt-1 text-sm leading-6 text-emerald-800">
              {emailSent
                ? `We sent a sign-in link to ${email}. Click it to continue — it expires in 15 minutes.`
                : 'Something went wrong sending that email — please try again in a moment.'}
            </p>
          </div>
        )}

        {(state === 'idle' || state === 'submitting' || state === 'error' || state === 'rate-limited') && (
          <>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Enter your email and we&apos;ll send you a secure sign-in link —
              new here or coming back, it works the same way either time.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
              <label>
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

            <p className="mt-6 text-sm text-slate-500">
              Prefer some guidance first?{' '}
              <Link href="/assessment" className="font-semibold text-emerald-700 underline underline-offset-2">
                Take our free assessment
              </Link>{' '}
              to see how your profile fits.
            </p>
          </>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
