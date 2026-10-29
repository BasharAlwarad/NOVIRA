'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/api/auth';
import { listMyMessages, markAllMessagesRead } from '@/lib/api/messages';
import type { EffectiveTier } from '@/lib/contracts/account';
import { usePolling } from '@/hooks/usePolling';
import { useLiveMessages } from '@/hooks/useLiveMessages';
import { MessagesPanel } from '@/components/messages-panel';

const navLinks = [
  { label: 'Services', href: '/#services' },
  { label: 'Contact', href: '/#contact' },
];

// Short labels for the persistent tier badge (point 2 of the 2026-10-04
// UI/UX hardening pass) — distinct from account/page.tsx's own TIER_LABELS,
// which spells out what each tier includes; this one needs to fit in a
// small pill, so the "what does this mean" job is left to wherever the
// badge links (the rewritten #services section).
const TIER_BADGE_LABELS: Record<EffectiveTier, string> = {
  Free: 'Free',
  Tier1: 'Tier 1',
  Tier2: 'Tier 2',
  Tier3: 'Tier 3',
};

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
  // Gates the "Assessment" nav link (point 4) — doesn't make sense to keep
  // inviting someone to retake the assessment once they already have a
  // profile from it.
  const [hasProfile, setHasProfile] = useState(false);

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
        setHasProfile(user?.hasProfile ?? false);

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
    <>
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* min-w-0 + truncate: without it, flex children never shrink below
            their text's natural content width, so at narrow (mobile) widths
            this block and the button group on the right fought for space —
            found live via a real measured 4-9px of horizontal page overflow
            at 390px width, with "Sign in"/"My matches" visibly overlapping
            the subtitle text. The subtitle now truncates with an ellipsis
            instead of wrapping unpredictably, and shrink-0 on the button
            group (below) means it's always this block that gives way, never
            the buttons. */}
        <Link href="/" className="group flex min-w-0 items-center gap-3 text-white">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 text-lg font-black text-emerald-300 ring-1 ring-emerald-400/30 transition group-hover:bg-emerald-400/25">
            N
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold uppercase tracking-[0.28em] text-emerald-200">
              NOVIRA
            </p>
            <p className="truncate text-xs text-slate-400">
              Study and work guidance in Germany
            </p>
          </div>
        </Link>

        <nav aria-label="Primary" className="hidden shrink-0 items-center gap-6 md:flex">
          {/* Doesn't make sense to keep inviting a retake once a profile
              already exists (point 4) — signed-out visitors and fresh
              signups with no profile yet still see it. */}
          {!hasProfile && (
            <Link
              href="/assessment"
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              Assessment
            </Link>
          )}
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
              {/* The persistent tier badge (point 2) — links through to
                  the rewritten #services section, which doubles as the
                  "what do I get at each level" explainer rather than
                  building a second one. */}
              {effectiveTier && (
                <Link
                  href="/#services"
                  className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/30 transition hover:bg-emerald-400/25"
                >
                  {TIER_BADGE_LABELS[effectiveTier]}
                </Link>
              )}
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

        <div className="flex shrink-0 items-center gap-3 md:hidden">
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
      {signedIn && effectiveTier && (
        <FloatingContactButton
          effectiveTier={effectiveTier}
          hasUnread={hasUnread}
          onOpen={() => {
            if (pathname !== '/account') {
              setHasUnread(false);
            }
          }}
        />
      )}
    </>
  );
}

// The floating contact icon (point 3 of the 2026-10-04 UI/UX hardening
// pass) — a slide-up drawer around the exact same MessagesPanel the
// dedicated /account/messages page uses, so this is never a second,
// divergent implementation of the conversation. Only rendered once signed
// in; messaging has no meaning for an anonymous visitor.
function FloatingContactButton({
  effectiveTier,
  hasUnread,
  onOpen,
}: {
  effectiveTier: EffectiveTier;
  hasUnread: boolean;
  onOpen: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          onOpen();
        }}
        aria-label="Contact us"
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M18 10c0 3.866-3.582 7-8 7a9.06 9.06 0 01-2.347-.306c-.584.296-1.925.864-4.181 1.234-.2.032-.352-.176-.273-.362.354-.836.674-1.95.77-2.966C2.249 13.016 2 11.57 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z"
            clipRule="evenodd"
          />
        </svg>
        {hasUnread && (
          <span
            className="absolute right-0 top-0 h-3.5 w-3.5 rounded-full bg-red-500 ring-2 ring-white"
            aria-label="New message"
          />
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end bg-slate-950/20 p-4"
          onClick={() => setOpen(false)}
        >
          <div onClick={(event) => event.stopPropagation()} className="w-full max-w-sm">
            <MessagesPanel effectiveTier={effectiveTier} heightClassName="h-[28rem]" onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
