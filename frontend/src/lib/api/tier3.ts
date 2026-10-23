import type { Tier3Case } from '@/lib/contracts/tier3';

export class NotSignedInError extends Error {
  constructor() {
    super('Not signed in.');
    this.name = 'NotSignedInError';
  }
}

export async function fetchMyTier3Case(): Promise<Tier3Case | null> {
  const response = await fetch('/api/tier3/my-case');

  if (response.status === 401) {
    throw new NotSignedInError();
  }
  if (!response.ok) {
    throw new Error('Failed to load your Tier 3 case.');
  }

  return (await response.json()) as Tier3Case | null;
}

export async function requestTier3(): Promise<Tier3Case> {
  const response = await fetch('/api/tier3/request', { method: 'POST' });

  if (response.status === 401) {
    throw new NotSignedInError();
  }
  if (!response.ok) {
    throw new Error('Failed to send your request — try again.');
  }

  return (await response.json()) as Tier3Case;
}

export async function signTier3Agreement(fullName: string): Promise<Tier3Case> {
  const response = await fetch('/api/tier3/sign-agreement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName }),
  });

  if (response.status === 401) {
    throw new NotSignedInError();
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? 'Failed to sign the agreement — try again.');
  }

  return (await response.json()) as Tier3Case;
}

export async function verifySuccessFeeSession(sessionId: string): Promise<Tier3Case> {
  const response = await fetch('/api/tier3/verify-success-fee-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });

  if (response.status === 401) {
    throw new NotSignedInError();
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? 'Could not verify your payment.');
  }

  return (await response.json()) as Tier3Case;
}
