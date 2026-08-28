import type { Message } from '@/lib/contracts/messages';

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
