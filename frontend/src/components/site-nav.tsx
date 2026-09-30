'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/api/auth';
import { listMyMessages, markAllMessagesRead } from '@/lib/api/messages';
import type { EffectiveTier } from '@/lib/contracts/account';
import { usePolling } from '@/hooks/usePolling';
import { useLiveMessages } from '@/hooks/useLiveMessages';

const navLinks = [
  { label: 'Assessment', href: '/assessment' },
  { label: 'Services', href: '/#services' },
  { label: 'Contact', href: '/#contact' },
];

// Slower than the account page's own poll (SiteNav renders on every page,
// so this fires far more often across a session) — the badge just needs to
// eventually catch up, not be instant. See CLAUDE.md's messaging entry for
// why polling was chosen over WebSockets/SSE.
const UNREAD_POLL_INTERVAL_MS = 45_000;

// Signed-in state is checked client-side via /api/auth/me (same call
// SignupPrompt.tsx already makes) — this is the "reserved for account/login
// controls once auth exists" slot the component originally called out.
// Kept simple: three states (unknown while loading, signed-out, signed-in),
// no flash of the wrong state is worth engineering around yet at this scale.
export function SiteNav() {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const [effectiveTier, setEffectiveTier] = useState<EffectiveTier | null>(null);

  // Best-effort — a failed fetch just means a stale/missing badge, not
  // worth surfacing as an error on every page that renders the nav. A
  // presence dot now (2026-09-30), not a count — the founder's own
  // correction, matching the same change already made on the admin side.
  const refreshUnreadCount = useCallback(() => {
    listMyMessages()
      .then((messages) => {
        setHasUnread(messages.some((message) => message.readAt === null));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((user) => {
        if (cancelled) return;
        setSignedIn(user !== null);
        setEffectiveTier(user?.effectiveTier ?? null);

        if (user !== null) {
          refreshUnreadCount();
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSignedIn(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshUnreadCount]);

  // Tier2+ gets instant push instead of waiting up to 45s — see
  // useLiveMessages.ts's own comment for why this hook is a no-op for
  // Free/Tier1, who keep exactly this poll as before.
  const isLiveTier = effectiveTier === 'Tier2' || effectiveTier === 'Tier3';
  usePolling(refreshUnreadCount, UNREAD_POLL_INTERVAL_MS, signedIn === true && !isLiveTier);

  // Found live 2026-09-30: a message arriving while the user is already ON
  // /account (watching it appear in the thread there) still lit up this
  // badge, because this hook only ever incremented a local tally — it never
  // checked whether the user was already looking at it. Same "already
  // viewing marks it seen" fix as the admin side: being on /account when a
  // push lands is itself proof it's been seen, so mark it read immediately
  // instead of flagging it as unread.
  useLiveMessages(effectiveTier, () => {
    if (pathname === '/account') {
      markAllMessagesRead().catch(() => {});
      setHasUnread(false);
    } else {
      setHasUnread(true);
    }
  });

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3 text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/15 text-lg font-black text-emerald-300 ring-1 ring-emerald-400/30 transition group-hover:bg-emerald-400/25">
            N
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-200">
              NOVIRA
            </p>
            <p className="text-xs text-slate-400">
              Study and work guidance in Germany
            </p>
          </div>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          {signedIn && (
            <>
              <Link
                href="/matches"
                className="text-sm font-medium text-slate-300 transition hover:text-white"
              >
                My matches
              </Link>
              <Link
                href="/account"
                className="flex items-center gap-1.5 text-sm font-medium text-slate-300 transition hover:text-white"
              >
                My account
                {hasUnread && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400" aria-label="New message" />
                )}
              </Link>
            </>
          )}
          {signedIn === false && (
            <Link
              href="/signin"
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              Sign in
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3 md:hidden">
          {signedIn === false && (
            <Link
              href="/signin"
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              Sign in
            </Link>
          )}
          {signedIn && (
            <Link
              href="/matches"
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              My matches
            </Link>
          )}
          <Link
            href={signedIn ? '/account' : '/assessment'}
            className="btn btn-sm rounded-full border-0 bg-emerald-400 text-slate-950 hover:bg-emerald-300"
          >
            {signedIn ? 'My account' : 'Start questionnaire'}
            {signedIn && hasUnread && (
              <span className="ml-1.5 h-2 w-2 rounded-full bg-slate-950/60" aria-label="New message" />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
