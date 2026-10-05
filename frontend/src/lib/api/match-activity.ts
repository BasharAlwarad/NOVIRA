import type { MatchActivity } from '@/lib/contracts/match-activity';

export class NotSignedInError extends Error {
  constructor() {
    super('Not signed in.');
    this.name = 'NotSignedInError';
  }
}

export async function listMyMatchActivity(): Promise<MatchActivity[]> {
  const response = await fetch('/api/match-activity');

  if (response.status === 401) {
    throw new NotSignedInError();
  }
  if (!response.ok) {
    throw new Error('Failed to load your applied matches.');
  }

  return (await response.json()) as MatchActivity[];
}

export async function markMatchApplied(opportunityId: string): Promise<MatchActivity> {
  const response = await fetch(`/api/matches/${opportunityId}/applied`, { method: 'POST' });

  if (response.status === 401) {
    throw new NotSignedInError();
  }
  if (!response.ok) {
    throw new Error('Failed to mark this as applied.');
  }

  return (await response.json()) as MatchActivity;
}

export async function unmarkMatchApplied(opportunityId: string): Promise<void> {
  const response = await fetch(`/api/matches/${opportunityId}/applied`, { method: 'DELETE' });

  if (response.status === 401) {
    throw new NotSignedInError();
  }
  if (!response.ok) {
    throw new Error('Failed to undo that.');
  }
}
