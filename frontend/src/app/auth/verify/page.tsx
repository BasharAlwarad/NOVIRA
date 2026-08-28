'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { verifyMagicLink } from '@/lib/api/auth';
import { SiteFooter } from '@/components/site-footer';
import { SiteNav } from '@/components/site-nav';

type VerifyState = 'verifying' | 'success' | 'error';

// useSearchParams() requires a Suspense boundary (Next.js opts the page out
// of static prerendering otherwise — this build broke on that exact error
// until this was added) — the actual token-reading logic lives in the inner
// component below, this just wraps it.
export default function AuthVerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 text-slate-900">
          <SiteNav />
          <section className="mx-auto w-full max-w-lg px-4 py-24 text-center sm:px-6">
            <p className="text-sm text-slate-600">Signing you in…</p>
          </section>
          <SiteFooter />
        </main>
      }
    >
      <AuthVerifyContent />
    </Suspense>
  );
}

function AuthVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<VerifyState>('verifying');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState('error');
      return;
    }

    verifyMagicLink({ token })
      .then(() => {
        router.replace('/matches');
      })
      .catch(() => {
        setState('error');
      });
    // Only ever runs once per page load against the token in the URL — a
    // fresh token would mean a fresh page load anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteNav />
      <section className="mx-auto w-full max-w-lg px-4 py-24 text-center sm:px-6">
        {state === 'verifying' && (
          <p className="text-sm text-slate-600">Signing you in…</p>
        )}

        {state === 'error' && (
          <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <h1 className="text-xl font-semibold text-slate-950">
              This link is invalid or has expired
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Sign-in links only work once and expire after 15 minutes.
              Request a new one.
            </p>
            <Link
              href="/signin"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-emerald-400 px-6 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              Sign in again
            </Link>
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
