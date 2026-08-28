'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminUnauthorizedError, listUsers } from '@/lib/api/admin-users';
import type { AdminUserListItem } from '@/lib/contracts/admin-users';
import { useAdminKey } from '@/hooks/useAdminKey';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function UserRow({ user }: { user: AdminUserListItem }) {
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
          {user.fraudFlagged && (
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
              Flagged
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

export default function AdminUsersProfilesPage() {
  const { adminKey, clearAdminKey } = useAdminKey();
  const [users, setUsers] = useState<AdminUserListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

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

  const needsReview = users?.filter((u) => u.pendingDocumentCount > 0) ?? [];
  const others = users?.filter((u) => u.pendingDocumentCount === 0) ?? [];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-semibold text-slate-950">User profiles</h1>
        <p className="mt-1 text-sm text-slate-600">
          {users ? `${users.length} user${users.length === 1 ? '' : 's'}` : 'Loading…'}
          {needsReview.length > 0 && ` · ${needsReview.length} with documents pending review`}
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

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {users === null ? (
          <p className="mt-8 text-sm text-slate-500">Loading…</p>
        ) : users.length === 0 ? (
          <p className="mt-8 text-sm text-slate-500">No users found.</p>
        ) : (
          <>
            {needsReview.length > 0 && (
              <section className="mt-8">
                <h2 className="text-sm font-semibold text-amber-700">Needs review</h2>
                <div className="mt-3 space-y-3">
                  {needsReview.map((user) => (
                    <UserRow key={user.id} user={user} />
                  ))}
                </div>
              </section>
            )}

            <section className="mt-8">
              <h2 className="text-sm font-semibold text-slate-500">
                {needsReview.length > 0 ? 'All other users' : 'All users'}
              </h2>
              <div className="mt-3 space-y-3">
                {others.map((user) => (
                  <UserRow key={user.id} user={user} />
                ))}
                {others.length === 0 && needsReview.length === 0 && (
                  <p className="text-sm text-slate-500">No users yet.</p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
