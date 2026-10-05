'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { listMyMessages, markAllMessagesRead, sendMyMessage } from '@/lib/api/messages';
import type { Message } from '@/lib/contracts/messages';
import type { EffectiveTier } from '@/lib/contracts/account';
import { usePolling } from '@/hooks/usePolling';
import { useLiveMessages } from '@/hooks/useLiveMessages';

// How often to check for new messages while a panel is mounted — see
// CLAUDE.md's messaging entry for why polling was chosen over WebSockets/
// SSE as the baseline (Tier2+ gets real push on top, via useLiveMessages).
const MESSAGE_POLL_INTERVAL_MS = 20_000;

function formatMessageDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// A plain navigation, not a JS fetch-then-window.open() — found live
// 2026-10-02: a real browser's popup blocker silently swallowed
// window.open() called after an awaited fetch. A real anchor click
// sidesteps that entirely — see the git history on this file's predecessor
// in account/page.tsx for the full investigation.
function AttachmentDownloadButton({ messageId, fileName }: { messageId: string; fileName: string | null }) {
  return (
    <div className="mt-3 flex items-center gap-2 border-t border-slate-200/70 pt-3">
      <a
        href={`/api/messages/${messageId}/attachment`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
      >
        {`⬇ Download${fileName ? ` ${fileName}` : ''}`}
      </a>
    </div>
  );
}

// The messaging UI, built once and shared by /account/messages (point 7)
// and the floating contact drawer (point 3) — per the 2026-10-04 UI/UX
// hardening pass, these were explicitly agreed to share one component so
// they can never drift apart into two different experiences of the same
// conversation. Self-contained: owns its own fetch/poll/live-push/send
// lifecycle rather than taking messages as a prop, since every consumer
// would otherwise have to duplicate that wiring (previously only ever
// built once, inside account/page.tsx).
//
// Phone-style layout (point 8) — a bounded-height flex column with the
// message list as the only scrolling child (flex-1 overflow-y-auto) and
// the input bar as a non-scrolling last child (shrink-0), so the input
// never requires scrolling the whole page to reach, the same shape every
// real chat app uses. heightClassName lets the two consumers size this
// differently (a tall panel for the dedicated page, a shorter one for the
// drawer) without duplicating the component.
export function MessagesPanel({
  effectiveTier,
  heightClassName = 'h-[70vh]',
  showHeader = true,
  onClose,
}: {
  effectiveTier: EffectiveTier;
  heightClassName?: string;
  showHeader?: boolean;
  // Only passed by the floating drawer (point 3) — the dedicated
  // /account/messages page has no need to close itself.
  onClose?: () => void;
}) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const canReply = effectiveTier === 'Tier2' || effectiveTier === 'Tier3';

  const loadMessages = useCallback(() => {
    listMyMessages()
      .then((data) => {
        setMessages(data);
        // Viewing this panel is what "read" means (see MessagesEndpoints.cs's
        // POST /read-all) — fire-and-forget, a failure just leaves the
        // unread dot until the next successful load.
        if (data.some((message) => message.readAt === null)) {
          markAllMessagesRead().catch(() => {});
        }
      })
      .catch(() => {
        // Best-effort — the panel just shows its own "couldn't load" state.
      });
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Tier2+ gets instant push instead of waiting up to 20s (see
  // useLiveMessages.ts); everyone else keeps exactly this poll.
  const isLiveTier = effectiveTier === 'Tier2' || effectiveTier === 'Tier3';
  usePolling(loadMessages, MESSAGE_POLL_INTERVAL_MS, !isLiveTier);

  useLiveMessages(effectiveTier, (message) => {
    setMessages((current) => [message, ...(current ?? [])]);
    markAllMessagesRead().catch(() => {});
  });

  // Newest-first data (see listMyMessages), rendered oldest-first visually
  // (a real chat reads top-to-bottom, oldest at top) — reversed only here,
  // at render time, so every other consumer of the raw list (unread
  // counting, etc.) keeps working against the original order.
  const chronological = messages ? [...messages].reverse() : null;

  // Keep the view pinned to the newest message (bottom) whenever the list
  // changes — matches the researched chat-UX pattern of auto-scrolling to
  // the live edge on new content.
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [chronological?.length]);

  const handleSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim()) return;

    setSending(true);
    setError(null);
    try {
      const sent = await sendMyMessage({ body: draft.trim() });
      setDraft('');
      setMessages((current) => [sent, ...(current ?? [])]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send — try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`flex ${heightClassName} flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white`}>
      {showHeader && (
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Messages</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {canReply
                ? 'Live chat with our team — replies arrive instantly.'
                : 'Updates from our team — document decisions and anything else we send you land here.'}
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          )}
        </div>
      )}

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {chronological === null ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : chronological.length === 0 ? (
          <p className="text-sm text-slate-500">No messages yet.</p>
        ) : (
          chronological.map((message) => (
            <div
              key={message.id}
              className={`rounded-2xl p-4 ${
                message.sender === 'User'
                  ? 'ml-6 bg-emerald-50 sm:ml-12'
                  : 'mr-6 border border-slate-200 bg-slate-50 sm:mr-12'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  {message.readAt === null && message.sender === 'Admin' && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-label="Unread" />
                  )}
                  {message.sender === 'Admin' ? message.subject : 'You'}
                </p>
                <p className="shrink-0 text-xs text-slate-400">{formatMessageDateTime(message.createdAt)}</p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{message.body}</p>
              {message.hasAttachment && (
                <AttachmentDownloadButton messageId={message.id} fileName={message.attachmentFileName} />
              )}
            </div>
          ))
        )}
      </div>

      {canReply && (
        <form onSubmit={handleSend} className="shrink-0 border-t border-slate-100 p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message…"
              rows={1}
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              className="shrink-0 rounded-full bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? '…' : 'Send'}
            </button>
          </div>
          {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        </form>
      )}
    </div>
  );
}
