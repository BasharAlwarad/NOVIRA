'use client';

import { useState } from 'react';
import { fetchMessageAttachmentUrl } from '@/lib/api/admin-users';
import type { Message } from '@/lib/contracts/messages';
import { openInNewTabAfterFetch } from '@/lib/open-in-new-tab';

// Extracted 2026-11-07 from the admin user-detail page into a shared
// component — the new /admin/inbox page needs the exact same thread view
// and reply box for its inline-reply cards, and a second hand-copied
// implementation would just be two things to keep in sync. One real
// implementation, used by both /admin/users/profiles/{id} and /admin/inbox.
// The original unbounded MessageHistorySection/MessageForm pair this
// started as is gone (removed 2026-11-07) — found live: it pushed the Send
// box far down the page on any real multi-message thread, on both surfaces,
// so CompactMessageThread below (originally built for Inbox alone) became
// the one real implementation for both instead of a second thing to keep in
// sync with it.

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// One message bubble, shared by every message-thread view in the admin.
function MessageBubble({ message, adminKey, userId }: { message: Message; adminKey: string; userId: string }) {
  return (
    <div
      className={`rounded-2xl p-4 ${
        message.sender === 'User'
          ? 'border border-emerald-200 bg-emerald-50/60'
          : 'border border-slate-200 bg-slate-50'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-950">
          {message.sender === 'User' ? 'From user' : message.subject}
        </p>
        <div className="flex items-center gap-2">
          {message.sender === 'Admin' && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                message.readAt ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              {message.readAt ? 'Read' : 'Unread'}
            </span>
          )}
          <p className="text-xs text-slate-400">{formatDateTime(message.createdAt)}</p>
        </div>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{message.body}</p>
      {message.hasAttachment && (
        <AdminAttachmentDownloadButton
          adminKey={adminKey}
          userId={userId}
          messageId={message.id}
          fileName={message.attachmentFileName}
        />
      )}
    </div>
  );
}

// A bounded, chat-style panel — the one message-thread view used across
// the admin side (both /admin/inbox's inline reply and the full
// /admin/users/profiles/{id} Messages tab, as of 2026-11-07). Mirrors
// MessagesPanel's own layout (the user-facing equivalent,
// @/components/messages-panel.tsx) — fixed total height, the message list
// scrolls internally (`flex-1 overflow-y-auto`), the input stays put
// (`shrink-0`) at the bottom, so replying never requires scrolling the
// whole page past a long thread to reach the Send button. Messages arrive
// newest-first (same order the backend already returns), so the latest
// message is the first thing visible on open with no auto-scroll needed —
// scrolling down from there moves back through older history.
export function CompactMessageThread({
  messages,
  adminKey,
  userId,
  onSend,
}: {
  messages: Message[];
  adminKey: string;
  userId: string;
  onSend: (body: string) => Promise<void>;
}) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    try {
      await onSend(body);
      setBody('');
    } catch {
      setError('Failed to send — try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[28rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">No messages sent yet.</p>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} adminKey={adminKey} userId={userId} />
          ))
        )}
      </div>
      <form onSubmit={handleSubmit} className="shrink-0 border-t border-slate-200 bg-white p-3">
        <div className="flex items-end gap-2">
          <textarea
            required
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Message"
            rows={1}
            className="min-h-[2.5rem] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
          />
          <button
            type="submit"
            disabled={sending}
            className="shrink-0 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? '…' : 'Send'}
          </button>
        </div>
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      </form>
    </div>
  );
}

// Lets the founder re-download exactly what was sent to a user, e.g. to
// double-check a CV delivery. Can't be a plain <a href> — the admin-key
// header has no equivalent on a navigation — so this opens a blank tab
// synchronously on click, then redirects it once the SAS URL resolves (see
// openInNewTabAfterFetch's comment for why: a bare window.open() after the
// await gets silently popup-blocked in real browsers).
function AdminAttachmentDownloadButton({
  adminKey,
  userId,
  messageId,
  fileName,
}: {
  adminKey: string;
  userId: string;
  messageId: string;
  fileName: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    try {
      await openInNewTabAfterFetch(() => fetchMessageAttachmentUrl(adminKey, userId, messageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 flex items-center gap-2 border-t border-slate-200/70 pt-3">
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Opening…' : `⬇ Download${fileName ? ` ${fileName}` : ''}`}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
