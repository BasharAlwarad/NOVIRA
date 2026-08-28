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

// The standalone sign-in entry point — closes a real gap found 2026-08-28:
// the only other place that could request a magic link (SignupPrompt.tsx)
// only renders on /assessment/result, which itself hard-requires a saved
// assessment in localStorage. A returning user on a new device, or one
// who's cleared their browser data, or simply doesn't remember that URL,
// had no way back in short of redoing the entire 14-question assessment.
// This page works regardless of local state — no `profile` is sent (there
// may be no local assessment data at all), which is safe: `/auth/verify`
// only overwrites the stored profile when one is actually provided, so an
// existing account's data is left untouched.
export default function SignInPage() {
  const [state, setState] = useState<PageState>('checking-session');
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
          Sign in
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl">
          Welcome back
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
              href="/matches"
              className="mt-3 inline-flex h-11 items-center justify-center rounded-full bg-emerald-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              View my matches
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
                ? `We sent a sign-in link to ${email}. Click it to get back in — it expires in 15 minutes.`
                : 'Something went wrong sending that email — please try again in a moment.'}
            </p>
          </div>
        )}

        {(state === 'idle' || state === 'submitting' || state === 'error' || state === 'rate-limited') && (
          <>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              No password to remember — enter the email you used before and
              we&apos;ll send you a link to sign back in.
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
              Don&apos;t have an account yet?{' '}
              <Link href="/assessment" className="font-semibold text-emerald-700 underline underline-offset-2">
                Take the assessment
              </Link>
            </p>
          </>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
