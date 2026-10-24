'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminUnauthorizedError, listDevMagicLinks } from '@/lib/api/admin-dev-links';
import type { DevMagicLink } from '@/lib/api/admin-dev-links';
import { useAdminKey } from '@/hooks/useAdminKey';

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function LinkRow({ link }: { link: DevMagicLink }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(link.verifyUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{link.email}</p>
        <p className="mt-0.5 text-xs text-slate-400">{formatTime(link.createdAt)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <a
          href={link.verifyUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
        >
          Open & sign in
        </a>
      </div>
    </div>
  );
}

// A dev-only convenience, nothing more — Resend's free sandbox tier can
// only deliver to the account owner's exact email address (CLAUDE.md's
// pre-deployment blockers), so every `+tag` test account's real magic-link
// email silently never arrives. The backend already logs the raw link to
// its own console for exactly this reason; this page just makes that
// browsable instead of needing to scroll a terminal mid-test. The backend
// endpoint this calls doesn't exist outside Development (Program.cs), so
// this page harmlessly shows nothing/fails if ever hit against a
// non-local backend — that's the real gate, not anything client-side.
export default function AdminDevLinksPage() {
  const { adminKey, clearAdminKey } = useAdminKey();
  const [links, setLinks] = useState<DevMagicLink[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await listDevMagicLinks(adminKey);
      setLinks(data);
      setError(null);
    } catch (err) {
      if (err instanceof AdminUnauthorizedError) {
        clearAdminKey();
      } else {
        setError(
          'Failed to load — if this backend is running in Production, this page has nothing to show on purpose.'
        );
      }
    }
  }, [adminKey, clearAdminKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // Polls fairly often on purpose — the whole point is seeing a new link
    // show up right after clicking "send me a sign-in link" elsewhere,
    // without a manual refresh.
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-xl font-semibold text-slate-950">Dev magic links</h1>
        <p className="mt-1 text-sm text-slate-600">
          The most recent sign-in links generated locally — use these instead of waiting on an
          email that Resend&apos;s sandbox tier can&apos;t actually deliver to a test address.
          Updates automatically every few seconds.
        </p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 space-y-3">
          {links === null ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : links.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nothing yet — request a sign-in link somewhere and it&apos;ll show up here.
            </p>
          ) : (
            links.map((link, index) => <LinkRow key={`${link.email}-${link.createdAt}-${index}`} link={link} />)
          )}
        </div>
      </div>
    </main>
  );
}
