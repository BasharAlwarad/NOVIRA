'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentUser, logout } from '@/lib/api/auth';
import { listMyMessages, markAllMessagesRead } from '@/lib/api/messages';
import type { EffectiveTier } from '@/lib/contracts/account';
import { usePolling } from '@/hooks/usePolling';
import { useLiveMessages } from '@/hooks/useLiveMessages';
import { MessagesPanel } from '@/components/messages-panel';
import { TierBadge } from '@/components/tier-badge';
import { EFFECTIVE_TIER_ICON_CONFIG } from '@/components/current-tier-badge';

const navLinks = [
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
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const [effectiveTier, setEffectiveTier] = useState<EffectiveTier | null>(null);
  // For the account dropdown's header row (2026-11-07) — same "name, email,
  // plan" header SaaSFrame's profile-menu research described.
  const [email, setEmail] = useState<string | null>(null);
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
        setEmail(user?.email ?? null);

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

  // Moved here from account/page.tsx's own AccountMenu (2026-11-07) — sign
  // out is now reachable from the nav's account dropdown on every page, not
  // just from within /account itself.
  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* min-w-0 + truncate: without it, flex children never shrink below
            their text's natural content width, so at narrow (mobile) widths
            this block and the button group on the right fought for space —
            found live via a real measured 4-9px of horizontal page overflow
            at 390px width, with "Sign in"/"My matches" visibly overlapping
            the subtitle text. shrink-0 on the button group (below) means
            it's always this block that gives way, never the buttons.

            On mobile specifically, the founder wanted more than truncation
            — the icon stacks above the wordmark instead of sitting beside
            it (flex-col, reverting to the original side-by-side flex-row
            at sm:), both shrink, and the subtitle (the actual space-hog)
            is dropped entirely rather than just truncated. Desktop (sm:+)
            is untouched — full-size icon, side-by-side, subtitle shown. */}
        <Link
          href="/"
          className="group flex min-w-0 flex-col items-start gap-1 text-white sm:flex-row sm:items-center sm:gap-3"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-xs font-black text-emerald-300 ring-1 ring-emerald-400/30 transition group-hover:bg-emerald-400/25 sm:h-11 sm:w-11 sm:rounded-2xl sm:text-lg">
            N
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200 sm:text-sm sm:tracking-[0.28em]">
              NOVIRA
            </p>
            <p className="hidden truncate text-xs text-slate-400 sm:block">
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
          {signedIn && effectiveTier && (
            <>
              <Link
                href="/matches"
                className="text-sm font-medium text-slate-300 transition hover:text-white"
              >
                My matches
              </Link>
              <AccountNavMenu
                effectiveTier={effectiveTier}
                email={email}
                hasUnread={hasUnread}
                onLogout={handleLogout}
                variant="desktop"
              />
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
          {signedIn && effectiveTier ? (
            <AccountNavMenu
              effectiveTier={effectiveTier}
              email={email}
              hasUnread={hasUnread}
              onLogout={handleLogout}
              variant="mobile"
            />
          ) : (
            <Link
              href="/assessment"
              className="btn btn-sm rounded-full border-0 bg-emerald-400 text-slate-950 hover:bg-emerald-300"
            >
              Start questionnaire
            </Link>
          )}
        </div>
      </div>
    </header>
      {signedIn && effectiveTier && pathname !== '/account/messages' && (
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

// The nav's single account control (2026-11-07) — replaces what used to be
// two separate things: a plain "My account" link here, plus a standalone
// "Account settings" dropdown (Sign out / Delete account) that only
// appeared once you were already on /account. Research (SaaSFrame's
// profile-menu pattern, OneSignal's unified account dropdown) consistently
// puts plan status, account info, and settings/sign-out together in one
// menu anchored on the account control, not spread across two places —
// also closes a real complaint found live: the tier medallion showing both
// here AND again on /account's own page header read as the same cue shown
// twice. The medallion now lives only here; /account's page header lost
// its own copy of it entirely.
function AccountNavMenu({
  effectiveTier,
  email,
  hasUnread,
  onLogout,
  variant,
}: {
  effectiveTier: EffectiveTier;
  email: string | null;
  hasUnread: boolean;
  onLogout: () => void;
  // 'desktop': plain text link styling, inline in the nav row. 'mobile':
  // the existing solid-emerald pill button styling — same visual treatment
  // each already had as a plain link, just now a dropdown trigger instead.
  variant: 'desktop' | 'mobile';
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const config = EFFECTIVE_TIER_ICON_CONFIG[effectiveTier];

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={
          variant === 'desktop'
            ? 'flex items-center gap-1.5 text-sm font-medium text-slate-300 transition hover:text-white'
            : 'btn btn-sm rounded-full border-0 bg-emerald-400 text-slate-950 hover:bg-emerald-300'
        }
      >
        <TierBadge icon={config.icon} variant={config.variant} size="xs" />
        My account
        {hasUnread && (
          <span
            className={`h-2 w-2 rounded-full ${variant === 'desktop' ? 'bg-emerald-400' : 'bg-slate-950/60'}`}
            aria-label="New message"
          />
        )}
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 opacity-70" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-[0_16px_48px_rgba(15,23,42,0.12)]"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <TierBadge icon={config.icon} variant={config.variant} size="xs" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-900">{config.label}</p>
              {email && <p className="truncate text-[11px] text-slate-500">{email}</p>}
            </div>
          </div>
          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            My account
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
          <Link
            href="/account/delete"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            Delete account
          </Link>
        </div>
      )}
    </div>
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
