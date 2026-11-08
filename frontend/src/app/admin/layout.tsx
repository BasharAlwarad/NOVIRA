'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { AdminKeyContext } from '@/hooks/useAdminKey';
import { AdminReplyNotificationsContext } from '@/hooks/useAdminReplyNotifications';
import { useAdminLiveMessages } from '@/hooks/useAdminLiveMessages';

const ADMIN_KEY_STORAGE_KEY = 'novira.admin.key';

const NAV_ITEMS = [
  { label: 'Inbox', href: '/admin/inbox' },
  { label: 'Opportunities', href: '/admin/opportunities' },
  { label: 'Users', href: '/admin/users/profiles' },
  { label: 'CV requests', href: '/admin/cv-requests' },
  { label: 'Tier 3 cases', href: '/admin/tier3-cases' },
  { label: 'Dev links', href: '/admin/dev-links' },
];

// The single admin gate — every /admin/* page used to duplicate this exact
// unlock form, sessionStorage read/write, and 401-clearing logic on its
// own. Centralized here so the key is entered once per browser tab (same
// sessionStorage-backed persistence as before, just no longer re-checked
// per page) and every admin page consumes it via useAdminKey(), with a
// real nav between sections instead of navigating by typing URLs.
//
// Deliberately does NOT re-prompt for the key on every page navigation —
// that would add friction without any real security gain, since the key
// sits in sessionStorage the whole time regardless of whether the UI
// re-asks for it. The actual safety valve for "don't leave this unlocked"
// is the Log out button below, not a re-auth-per-click flow.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [adminKey, setAdminKeyState] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [unreadReplyUserIds, setUnreadReplyUserIds] = useState<Set<string>>(new Set());
  const [cvRequestsNeedingAttention, setCvRequestsNeedingAttention] = useState<Set<string>>(new Set());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAdminKeyState(window.sessionStorage.getItem(ADMIN_KEY_STORAGE_KEY));
    setChecked(true);
  }, []);

  // The nav row has 6 destinations plus a logout action — more than fits on
  // a phone screen at once (found live 2026-11-07: it was clipping off the
  // right edge entirely, with no way to reach Dev links/Log out). Made it a
  // horizontally scrollable strip instead of a hamburger drawer — research
  // (see the UX discussion this came out of) consistently finds hidden nav
  // hurts discoverability more than a visible scroll strip does, and with
  // only 6 flat items a drawer would cost an extra tap to reach any of
  // them. These two fades are the mitigation for scroll's one real
  // weakness (off-screen items are easy to miss) — a visible edge cue
  // whenever there's more content in that direction.
  const navScrollRef = useRef<HTMLElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const updateFades = useCallback(() => {
    const el = navScrollRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 4);
    setShowRightFade(el.scrollWidth - el.scrollLeft - el.clientWidth > 4);
  }, []);

  useEffect(() => {
    updateFades();
    window.addEventListener('resize', updateFades);
    return () => window.removeEventListener('resize', updateFades);
  }, [updateFades]);

  // Keeps whichever page you're actually on scrolled into view on load,
  // instead of it potentially sitting off-screen in the strip.
  useEffect(() => {
    navScrollRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
    updateFades();
  }, [pathname, updateFades]);

  // Closes the gap found live 2026-09-30: a Tier2+ user's reply only ever
  // showed up on the admin's next manual page refresh. Tracks WHICH users
  // have an unseen reply (not a bare count, per the founder's own
  // correction) — the Users list renders a per-row note from this, and the
  // user's own detail page clears its entry via markUserReplySeen once
  // actually opened.
  useAdminLiveMessages(
    adminKey,
    (push) => {
      setUnreadReplyUserIds((current) => {
        if (current.has(push.userId)) return current;
        const next = new Set(current);
        next.add(push.userId);
        return next;
      });
    },
    // A new CV request, or a pending one whose user's profile just changed
    // underneath it (2026-11-08) — see CvRequestAttentionPush's own
    // comment. Tracked by cvRequestId, not userId, since one user can have
    // several pending requests independently needing a look.
    (push) => {
      setCvRequestsNeedingAttention((current) => {
        if (current.has(push.cvRequestId)) return current;
        const next = new Set(current);
        next.add(push.cvRequestId);
        return next;
      });
    }
  );

  const markUserReplySeen = useCallback((userId: string) => {
    setUnreadReplyUserIds((current) => {
      if (!current.has(userId)) return current;
      const next = new Set(current);
      next.delete(userId);
      return next;
    });
  }, []);

  // Visiting the queue itself is "I looked" — clears everything at once
  // rather than per-card, see this context's own comment for why.
  const clearCvRequestsAttention = useCallback(() => {
    setCvRequestsNeedingAttention((current) => (current.size === 0 ? current : new Set()));
  }, []);

  const handleUnlock = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.sessionStorage.setItem(ADMIN_KEY_STORAGE_KEY, keyInput);
    setAdminKeyState(keyInput);
  };

  const clearAdminKey = () => {
    window.sessionStorage.removeItem(ADMIN_KEY_STORAGE_KEY);
    setAdminKeyState(null);
  };

  // Avoids a one-frame flash of the unlock form before the sessionStorage
  // read above resolves.
  if (!checked) {
    return null;
  }

  if (!adminKey) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <form
          onSubmit={handleUnlock}
          className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <h1 className="text-lg font-semibold text-slate-950">Admin access</h1>
          <p className="mt-1 text-sm text-slate-600">Enter the admin key to continue.</p>
          <input
            type="password"
            value={keyInput}
            onChange={(event) => setKeyInput(event.target.value)}
            placeholder="Admin key"
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
          />
          <button
            type="submit"
            className="mt-4 w-full rounded-full bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            Unlock
          </button>
        </form>
      </main>
    );
  }

  return (
    <AdminKeyContext.Provider value={{ adminKey, clearAdminKey }}>
      <AdminReplyNotificationsContext.Provider
        value={{ unreadReplyUserIds, markUserReplySeen, cvRequestsNeedingAttention, clearCvRequestsAttention }}
      >
        <div className="min-h-screen bg-slate-50">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex w-full max-w-3xl items-center px-4 py-3 sm:px-6">
              <div className="relative min-w-0 flex-1">
                {showLeftFade && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-white to-transparent"
                  />
                )}
                <nav
                  ref={navScrollRef}
                  onScroll={updateFades}
                  className="flex items-center gap-1 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {NAV_ITEMS.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        data-active={active}
                        className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                          active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {item.label}
                        {/* A lightweight ambient cue, not a replacement for the
                          Users list's own per-user flag (found live
                          2026-11-07: a reply only ever became visible once
                          an admin thought to go check Users specifically).
                          Presence only, no count — same dot-not-count
                          convention the public-facing SiteNav already uses
                          for this exact signal. Lives on Inbox now, not
                          Users (added the same day, right after this dot) —
                          Inbox is the actually-relevant destination for
                          "something needs a reply." A badge like this
                          existed once before and was removed in favor of
                          the per-user flag alone (2026-09-30) because a
                          bare aggregate badge didn't say which user; this
                          isn't that — the per-user flag on the Users list
                          is unchanged, this is purely "something needs a
                          look," visible from any admin page. */}
                        {item.href === '/admin/inbox' && unreadReplyUserIds.size > 0 && (
                          <span
                            className="h-2 w-2 rounded-full bg-emerald-500"
                            aria-label="New message from a user"
                          />
                        )}
                        {/* Same dot-not-count convention as Inbox's above,
                          for the same reason — added 2026-11-08. Lit by
                          CvRequestAttentionPush: a brand-new request, or a
                          pending one whose user's profile changed
                          underneath it. Cleared on visiting this page
                          itself (useAdminReplyNotifications's
                          clearCvRequestsAttention), not per-card. */}
                        {item.href === '/admin/cv-requests' && cvRequestsNeedingAttention.size > 0 && (
                          <span
                            className="h-2 w-2 rounded-full bg-emerald-500"
                            aria-label="A CV request needs attention"
                          />
                        )}
                      </Link>
                    );
                  })}
                </nav>
                {showRightFade && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-white to-transparent"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={clearAdminKey}
                aria-label="Log out of admin"
                className="ml-1 shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 sm:ml-4 sm:rounded-none sm:p-0 sm:text-xs sm:font-medium sm:underline-offset-2 sm:hover:bg-transparent sm:hover:underline"
              >
                <LogOut className="h-4 w-4 sm:hidden" aria-hidden="true" />
                <span className="hidden sm:inline">Log out of admin</span>
              </button>
            </div>
          </header>
          {children}
        </div>
      </AdminReplyNotificationsContext.Provider>
    </AdminKeyContext.Provider>
  );
}
