import type { MatchResult } from '@/lib/contracts/matches';

export class NotSignedInError extends Error {
  constructor() {
    super('Not signed in.');
    this.name = 'NotSignedInError';
  }
}

export async function fetchMyMatches(): Promise<MatchResult[]> {
  const response = await fetch('/api/matches');

  if (response.status === 401) {
    throw new NotSignedInError();
  }

  if (!response.ok) {
    throw new Error('Failed to load your matches.');
  }

  return (await response.json()) as MatchResult[];
}
