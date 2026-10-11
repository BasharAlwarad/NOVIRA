'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { AdminUnauthorizedError, listUsers } from '@/lib/api/admin-users';
import type { AdminUserListItem } from '@/lib/contracts/admin-users';
import type { EffectiveTier } from '@/lib/contracts/account';
import { useAdminKey } from '@/hooks/useAdminKey';
import { useAdminReplyNotifications } from '@/hooks/useAdminReplyNotifications';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// hasNewReply (added 2026-09-30) — a per-user note, not an aggregate count
// on the nav, per the founder's own correction: "a note next to the user,
// not with the amount of new messages received." Sourced from the live
// SignalR connection the layout maintains (useAdminReplyNotifications),
// cleared once the admin actually opens that user's detail page.
function UserRow({ user, hasNewReply }: { user: AdminUserListItem; hasNewReply: boolean }) {
  return (
    <Link
      href={`/admin/users/profiles/${user.id}`}
      className="block rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-emerald-300"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            {user.verifiedFullName ?? user.fullName ?? '(no name on file)'}
            {user.verifiedFullName && (
              <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                Verified
              </span>
            )}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{user.email}</p>
          <p className="mt-1 text-xs text-slate-400">Joined {formatDate(user.createdAt)}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {hasNewReply && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
              New message
            </span>
          )}
          {user.fraudFlagged && (
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
              Flagged
            </span>
          )}
          {user.deletionScheduledFor && (
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
              Deleting {formatDate(user.deletionScheduledFor)}
            </span>
          )}
          {user.effectiveTier !== 'Free' && (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {user.effectiveTier}
            </span>
          )}
          {user.pendingDocumentCount > 0 && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              {user.pendingDocumentCount} document{user.pendingDocumentCount === 1 ? '' : 's'} pending review
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// "User level" — mutually exclusive, so tabs rather than toggle chips (same
// reasoning /matches' own status filter already settled on: a <select> or
// tabs for an exclusive choice, chips for combinable facets).
type TierFilter = 'All' | EffectiveTier;
const TIER_FILTERS: TierFilter[] = ['All', 'Free', 'Tier1', 'Tier2', 'Tier3'];

// The "other things to filter by" — combinable (AND'd together, not OR'd;
// e.g. Flagged + Tier2 means both must hold), unlike the tier tabs above.
// Each is cheap to compute from fields the list endpoint already returns
// (or, for hasNewReply, already has live client-side via the admin layout's
// SignalR connection) — no backend change needed.
type AttentionFlag = 'needsReview' | 'flagged' | 'pendingDeletion' | 'newMessage' | 'verified';
const ATTENTION_FLAGS: { key: AttentionFlag; label: string }[] = [
  { key: 'needsReview', label: 'Needs review' },
  { key: 'flagged', label: 'Flagged' },
  { key: 'pendingDeletion', label: 'Pending deletion' },
  { key: 'newMessage', label: 'New message' },
  { key: 'verified', label: 'Verified' },
];

function matchesFlag(
  user: AdminUserListItem,
  flag: AttentionFlag,
  hasNewReply: boolean
): boolean {
  switch (flag) {
    case 'needsReview':
      return user.pendingDocumentCount > 0;
    case 'flagged':
      return user.fraudFlagged;
    case 'pendingDeletion':
      return user.deletionScheduledFor !== null;
    case 'newMessage':
      return hasNewReply;
    case 'verified':
      return user.verifiedFullName !== null;
  }
}

// Backed by URL search params (?tier=, ?flags=), not local state, so a
// filtered view is bookmarkable/shareable — same pattern already used by
// /matches' status filter and /admin/opportunities' status tabs.
function parseFlagsParam(value: string | null): Set<AttentionFlag> {
  if (!value) return new Set();
  return new Set(value.split(',').filter((v): v is AttentionFlag =>
    ATTENTION_FLAGS.some((f) => f.key === v)
  ));
}

function AdminUsersProfilesPageContent() {
  const { adminKey, clearAdminKey } = useAdminKey();
  const { unreadReplyUserIds } = useAdminReplyNotifications();
  const [users, setUsers] = useState<AdminUserListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tierFilter = (searchParams.get('tier') as TierFilter | null) ?? 'All';
  const activeFlags = parseFlagsParam(searchParams.get('flags'));

  const loadUsers = useCallback(
    async (search: string) => {
      setError(null);
      try {
        const data = await listUsers(adminKey, search || undefined);
        setUsers(data);
      } catch (err) {
        if (err instanceof AdminUnauthorizedError) {
          clearAdminKey();
        } else {
          setError('Failed to load users.');
        }
      }
    },
    [adminKey, clearAdminKey]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsers(activeSearch);
  }, [activeSearch, loadUsers]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveSearch(searchInput.trim());
  };

  const buildFilterHref = (nextTier: TierFilter, nextFlags: Set<AttentionFlag>): string => {
    const params = new URLSearchParams();
    if (nextTier !== 'All') params.set('tier', nextTier);
    if (nextFlags.size > 0) params.set('flags', Array.from(nextFlags).join(','));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const toggleFlagHref = (flag: AttentionFlag): string => {
    const next = new Set(activeFlags);
    if (next.has(flag)) {
      next.delete(flag);
    } else {
      next.add(flag);
    }
    return buildFilterHref(tierFilter, next);
  };

  // Needs-review-first is already the list endpoint's own default order
  // (PendingDocumentCount > 0, then count, then newest) — filtering here
  // preserves that order rather than re-sorting, so the most useful ordering
  // survives even once a specific filter narrows the list down.
  const filtered = (users ?? []).filter((user) => {
    if (tierFilter !== 'All' && user.effectiveTier !== tierFilter) {
      return false;
    }
    for (const flag of activeFlags) {
      if (!matchesFlag(user, flag, unreadReplyUserIds.has(user.id))) {
        return false;
      }
    }
    return true;
  });

  const hasActiveFilters = tierFilter !== 'All' || activeFlags.size > 0;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-semibold text-slate-950">User profiles</h1>
        <p className="mt-1 text-sm text-slate-600">
          {users
            ? `${filtered.length} of ${users.length} user${users.length === 1 ? '' : 's'}${hasActiveFilters ? ' match this filter' : ''}`
            : 'Loading…'}
        </p>

        <form onSubmit={handleSearch} className="mt-6 flex gap-2">
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name or email"
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
          />
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Search
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-1 rounded-full bg-slate-100 p-1">
          {TIER_FILTERS.map((tier) => {
            const active = tier === tierFilter;
            return (
              <Link
                key={tier}
                href={buildFilterHref(tier, activeFlags)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tier === 'All' ? 'All' : tier === 'Tier1' ? 'Tier 1' : tier === 'Tier2' ? 'Tier 2' : tier === 'Tier3' ? 'Tier 3' : 'Free'}
              </Link>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {ATTENTION_FLAGS.map(({ key, label }) => {
            const active = activeFlags.has(key);
            return (
              <Link
                key={key}
                href={toggleFlagHref(key)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </Link>
            );
          })}
          {hasActiveFilters && (
            <Link
              href={pathname}
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
            >
              Clear filters
            </Link>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {users === null ? (
          <p className="mt-8 text-sm text-slate-500">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-8 text-sm text-slate-500">
            {hasActiveFilters ? 'No users match this filter.' : 'No users found.'}
          </p>
        ) : (
          <div className="mt-8 space-y-3">
            {filtered.map((user) => (
              <UserRow key={user.id} user={user} hasNewReply={unreadReplyUserIds.has(user.id)} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

// useSearchParams() requires a <Suspense> boundary or the production build
// fails to prerender the route — same fix already applied elsewhere
// (/auth/verify/page.tsx, /matches, the admin opportunities path pages).
export default function AdminUsersProfilesPage() {
  return (
    <Suspense fallback={null}>
      <AdminUsersProfilesPageContent />
    </Suspense>
  );
}
