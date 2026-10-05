'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { confirmAccountDeletion } from '@/lib/api/account';
import { SiteFooter } from '@/components/site-footer';
import { SiteNav } from '@/components/site-nav';

function formatFullDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Step 2 — the last deliberate checkpoint. Deliberately requires typing the
// account's own email, not just a click: a single click isn't enough
// friction for something irreversible, and this also can't be satisfied by
// a script that only has the link (see Architecture.md's research on this).
// Public page — the token in the URL is the authentication, same shape as
// /auth/verify.
function ConfirmDeleteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [typedEmail, setTypedEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setError(null);
    try {
      const result = await confirmAccountDeletion(token, typedEmail.trim());
      setScheduledFor(result.scheduledFor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong — try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <h1 className="text-xl font-semibold text-slate-950">This link is invalid</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Use the link from the confirmation email, or start over from your account page.
        </p>
      </div>
    );
  }

  if (scheduledFor) {
    return (
      <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <h1 className="text-xl font-semibold text-slate-950">Deletion scheduled</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your account will be permanently deleted on{' '}
          <strong>{formatFullDateTime(scheduledFor)}</strong>. You&apos;ve been signed out
          everywhere. Changed your mind? Just sign back in before then and cancel it from your
          account page.
        </p>
        <Link
          href="/signin"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-emerald-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-4xl border border-red-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <h1 className="text-xl font-semibold text-slate-950">Confirm account deletion</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Last step — type your account&apos;s email address below to confirm. You&apos;ll still
        have 7 days after this to change your mind by signing back in.
      </p>
      <form onSubmit={handleConfirm} className="mt-6">
        <label className="block text-xs font-semibold text-slate-600">
          Your account email
        </label>
        <input
          type="email"
          value={typedEmail}
          onChange={(e) => setTypedEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-red-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-red-100"
        />
        <button
          type="submit"
          disabled={submitting || !typedEmail.trim()}
          className="mt-4 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Confirming…' : 'Confirm deletion'}
        </button>
      </form>
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// useSearchParams() requires a Suspense boundary — same fix already applied
// to /auth/verify/page.tsx and the admin opportunities path pages.
export default function ConfirmDeleteAccountPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteNav />
      <section className="mx-auto w-full max-w-lg px-4 py-16 sm:px-6">
        <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
          <ConfirmDeleteContent />
        </Suspense>
      </section>
      <SiteFooter />
    </main>
  );
}
