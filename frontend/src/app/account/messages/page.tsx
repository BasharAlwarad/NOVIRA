'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/api/auth';
import type { EffectiveTier } from '@/lib/contracts/account';
import { MessagesPanel } from '@/components/messages-panel';
import { SiteFooter } from '@/components/site-footer';
import { SiteNav } from '@/components/site-nav';

type PageState =
  | { status: 'loading' }
  | { status: 'not-signed-in' }
  | { status: 'loaded'; effectiveTier: EffectiveTier };

// Point 7 of the 2026-10-04 UI/UX hardening pass — messages used to be one
// card among many on /account; this is their own route now. Reuses
// MessagesPanel, the exact same component the floating contact drawer uses
// (point 3), so the two can never show a different version of the same
// conversation.
export default function AccountMessagesPage() {
  const [state, setState] = useState<PageState>({ status: 'loading' });

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        setState(user ? { status: 'loaded', effectiveTier: user.effectiveTier } : { status: 'not-signed-in' });
      })
      .catch(() => setState({ status: 'not-signed-in' }));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteNav />
      <section className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <Link href="/account" className="text-xs font-medium text-slate-400 hover:text-slate-600">
          ← Back to your account
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl">Messages</h1>

        <div className="mt-6">
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

          {state.status === 'loaded' && <MessagesPanel effectiveTier={state.effectiveTier} />}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
