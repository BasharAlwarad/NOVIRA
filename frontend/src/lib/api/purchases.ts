import type { VerifySessionRequest, VerifySessionResponse } from '@/lib/contracts/purchases';

export class NotSignedInError extends Error {
  constructor() {
    super('Not signed in.');
    this.name = 'NotSignedInError';
  }
}

export async function verifyCheckoutSession(request: VerifySessionRequest): Promise<VerifySessionResponse> {
  const response = await fetch('/api/purchases/verify-session', {
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
    throw new Error(data?.message ?? 'Could not verify your payment.');
  }

  return data as VerifySessionResponse;
}
