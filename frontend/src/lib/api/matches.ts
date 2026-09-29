import type { MatchesResponse } from '@/lib/contracts/matches';

export class NotSignedInError extends Error {
  constructor() {
    super('Not signed in.');
    this.name = 'NotSignedInError';
  }
}

export async function fetchMyMatches(): Promise<MatchesResponse> {
  const response = await fetch('/api/matches');

  if (response.status === 401) {
    throw new NotSignedInError();
  }

  if (!response.ok) {
    throw new Error('Failed to load your matches.');
  }

  return (await response.json()) as MatchesResponse;
}
