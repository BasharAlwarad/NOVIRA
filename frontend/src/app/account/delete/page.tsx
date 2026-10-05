'use client';

import Link from 'next/link';
import { useState } from 'react';
import { requestAccountDeletion } from '@/lib/api/account';
import { SiteFooter } from '@/components/site-footer';
import { SiteNav } from '@/components/site-nav';

// Step 1 of the account-deletion cooling-off flow (Architecture.md's
// "UI/UX hardening pass" has the full 8-step design). Deliberately its own
// page, not a modal — no modal component exists anywhere in this codebase,
// and this is weighty enough to deserve one. Nothing here is destructive —
// this only ever sends an email; the real scheduling happens at
// /account/confirm-delete, after the user re-proves they own the inbox.
const REASON_OPTIONS = [
  'I found a different path',
  'It was too expensive',
  "I didn't find it useful",
  'Privacy concerns',
  'Other',
];

export default function DeleteAccountPage() {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [otherReason, setOtherReason] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setSending(true);
    setError(null);
    try {
      const reason =
        selectedReason === 'Other'
          ? otherReason.trim() || null
          : selectedReason;
      await requestAccountDeletion(reason);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong — try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteNav />
      <section className="mx-auto w-full max-w-lg px-4 py-16 sm:px-6">
        <Link href="/account" className="text-xs font-medium text-slate-400 hover:text-slate-600">
          ← Back to your account
        </Link>

        {sent ? (
          <div className="mt-6 rounded-4xl border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <h1 className="text-xl font-semibold text-slate-950">Check your email</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              We&apos;ve sent a confirmation link to your email. Nothing has happened to your
              account yet — click the link to confirm, and you&apos;ll still have 7 days after
              that to change your mind.
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-4xl border border-red-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <h1 className="text-xl font-semibold text-slate-950">Delete your account</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Your account won&apos;t be deleted immediately. After you confirm by email,
              you&apos;ll have a <strong>7-day cooling-off period</strong> — just sign back in
              anytime during those 7 days to cancel. After that, everything is permanently
              removed: your profile, uploaded documents, messages, and CV requests. This cannot
              be undone once the 7 days pass.
            </p>

            <div className="mt-6">
              <p className="text-sm font-semibold text-slate-900">
                Before you go, would you tell us why?
              </p>
              <p className="mt-1 text-xs text-slate-500">Totally optional — feel free to skip this.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {REASON_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSelectedReason(selectedReason === option ? null : option)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      selectedReason === option
                        ? 'bg-slate-950 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {selectedReason === 'Other' && (
                <textarea
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="Tell us more (optional)"
                  rows={2}
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-slate-100"
                />
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Send confirmation email'}
              </button>
              <Link
                href="/account"
                className="text-sm font-semibold text-slate-600 hover:text-slate-800"
              >
                Never mind
              </Link>
            </div>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
