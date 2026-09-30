import type { Message, SendUserMessageRequest } from '@/lib/contracts/messages';

export class NotSignedInError extends Error {
  constructor() {
    super('Not signed in.');
    this.name = 'NotSignedInError';
  }
}

export async function listMyMessages(): Promise<Message[]> {
  const response = await fetch('/api/messages');

  if (response.status === 401) {
    throw new NotSignedInError();
  }
  if (!response.ok) {
    throw new Error('Failed to load your messages.');
  }

  return (await response.json()) as Message[];
}

// Page-level, not per-message — see the comment on the backend endpoint.
export async function markAllMessagesRead(): Promise<void> {
  const response = await fetch('/api/messages/read-all', { method: 'POST' });

  if (response.status === 401) {
    throw new NotSignedInError();
  }
  if (!response.ok) {
    throw new Error('Failed to mark messages read.');
  }
}

// Tier2+ only — the backend itself enforces this (see the comment on
// MessagesEndpoints.cs's POST /), this is just the client-side call.
export async function sendMyMessage(request: SendUserMessageRequest): Promise<Message> {
  const response = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (response.status === 401) {
    throw new NotSignedInError();
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message ?? 'Failed to send your message.');
  }

  return data as Message;
}

// Exchanges the (server-only) session cookie for a short-lived, single-use
// SignalR connection ticket — see live-token/route.ts and
// LiveMessagingTicketStore.cs for why this indirection exists.
export async function requestLiveMessagingTicket(): Promise<string> {
  const response = await fetch('/api/messages/live-token', { method: 'POST' });

  if (response.status === 401) {
    throw new NotSignedInError();
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message ?? 'Failed to start live messaging.');
  }

  return (data as { ticket: string }).ticket;
}
