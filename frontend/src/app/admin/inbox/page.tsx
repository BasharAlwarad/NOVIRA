'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminUnauthorizedError, getUserDetail, listInbox, sendMessageToUser } from '@/lib/api/admin-users';
import type { AdminUserDetail, InboxEntry } from '@/lib/contracts/admin-users';
import { CompactMessageThread } from '@/components/admin/admin-message-thread';
import { useAdminKey } from '@/hooks/useAdminKey';
import { useAdminReplyNotifications } from '@/hooks/useAdminReplyNotifications';

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function MessageIcon({ className }: { className?: string }) {
  // Same chat-bubble glyph SiteNav's floating contact button already
  // uses — one icon language for "this is about messaging" across the
  // public and admin sides.
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M18 10c0 3.866-3.582 7-8 7a9.06 9.06 0 01-2.347-.306c-.584.296-1.925.864-4.181 1.234-.2.032-.352-.176-.273-.362.354-.836.674-1.95.77-2.966C2.249 13.016 2 11.57 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// One card per user whose most recent message is from them, not the team
// — built 2026-11-07 to close a real workflow gap: answering a message
// meant Users → find the row → open the full profile → click the Messages
// tab → scroll past Overview/Documents/CV tabs, for what's often a one-
// line reply. This is the fast path — read and reply right here, inline,
// with a link through to the full account only when more context (CV
// status, documents) is actually needed before replying.
function InboxCard({
  entry,
  adminKey,
  expanded,
  detail,
  detailLoading,
  onToggle,
  onSend,
}: {
  entry: InboxEntry;
  adminKey: string;
  expanded: boolean;
  detail: AdminUserDetail | undefined;
  detailLoading: boolean;
  onToggle: () => void;
  onSend: (body: string) => Promise<void>;
}) {
  const displayName = entry.verifiedFullName ?? entry.fullName ?? entry.email;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link href={`/admin/users/profiles/${entry.userId}`} className="group min-w-0">
          <p className="truncate text-base font-semibold text-slate-950 group-hover:text-emerald-700">
            {displayName}
          </p>
          <p className="truncate text-sm text-slate-600">{entry.email}</p>
        </Link>
        {entry.effectiveTier !== 'Free' && (
          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {entry.effectiveTier}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="mt-3 flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:bg-slate-100"
      >
        <MessageIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <p className={`text-sm text-slate-700 ${expanded ? '' : 'truncate'}`}>{entry.latestMessageBody}</p>
          <p className="mt-0.5 text-xs text-slate-400">{formatDateTime(entry.latestMessageCreatedAt)}</p>
        </div>
      </button>

      {expanded && (
        <div className="mt-4">
          {detailLoading || !detail ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <CompactMessageThread
              messages={detail.messages}
              adminKey={adminKey}
              userId={entry.userId}
              onSend={onSend}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminInboxPage() {
  const { adminKey } = useAdminKey();
  const { unreadReplyUserIds, markUserReplySeen } = useAdminReplyNotifications();
  const [entries, setEntries] = useState<InboxEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [detailsByUser, setDetailsByUser] = useState<Record<string, AdminUserDetail>>({});
  const [detailLoadingUserId, setDetailLoadingUserId] = useState<string | null>(null);

  const load = useCallback(() => {
    listInbox(adminKey)
      .then(setEntries)
      .catch((err) => {
        if (err instanceof AdminUnauthorizedError) return;
        setError('Failed to load the inbox.');
      });
  }, [adminKey]);

  useEffect(() => {
    load();
  }, [load]);

  // Re-fetch whenever a new reply arrives — reuses the same live SignalR
  // connection the admin layout already holds open (AdminReplyNotifications),
  // rather than this page opening a second connection to the same hub.
  useEffect(() => {
    if (unreadReplyUserIds.size > 0) {
      load();
    }
  }, [unreadReplyUserIds, load]);

  const handleToggle = (userId: string) => {
    const next = expandedUserId === userId ? null : userId;
    setExpandedUserId(next);
    if (next) {
      markUserReplySeen(userId);
      if (!detailsByUser[userId]) {
        setDetailLoadingUserId(userId);
        getUserDetail(adminKey, userId)
          .then((detail) => {
            setDetailsByUser((current) => ({ ...current, [userId]: detail }));
          })
          .catch(() => setError('Failed to load that conversation.'))
          .finally(() => setDetailLoadingUserId(null));
      }
    }
  };

  const handleSend = async (userId: string, body: string) => {
    await sendMessageToUser(adminKey, userId, { body });
    // The reply just sent means this user's latest message is now ours —
    // they correctly drop off the inbox list once this refetches, and the
    // open thread view gets the sent message appended.
    const [refreshedDetail] = await Promise.all([getUserDetail(adminKey, userId), load()]);
    setDetailsByUser((current) => ({ ...current, [userId]: refreshedDetail }));
  };

  return (
    <main>
      <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-slate-950">Inbox</h1>
        <p className="mt-1 text-sm text-slate-600">
          Every user whose latest message is waiting on a reply from the team.
        </p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 space-y-4">
          {entries === null && <p className="text-sm text-slate-500">Loading…</p>}
          {entries !== null && entries.length === 0 && (
            <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Nothing waiting on a reply — you&apos;re all caught up.
            </p>
          )}
          {entries?.map((entry) => (
            <InboxCard
              key={entry.userId}
              entry={entry}
              adminKey={adminKey}
              expanded={expandedUserId === entry.userId}
              detail={detailsByUser[entry.userId]}
              detailLoading={detailLoadingUserId === entry.userId}
              onToggle={() => handleToggle(entry.userId)}
              onSend={(body) => handleSend(entry.userId, body)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
