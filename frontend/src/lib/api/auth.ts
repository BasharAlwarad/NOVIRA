import type {
  MeResponse,
  RequestLinkRequest,
  RequestLinkResponse,
  VerifyRequest,
  VerifyResponse,
} from '@/lib/contracts/auth';

export class RateLimitedError extends Error {
  constructor() {
    super('Rate limited.');
    this.name = 'RateLimitedError';
  }
}

export async function requestMagicLink(
  payload: RequestLinkRequest
): Promise<RequestLinkResponse> {
  const response = await fetch('/api/auth/request-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (response.status === 429) {
    throw new RateLimitedError();
  }

  if (!response.ok) {
    throw new Error('Failed to send sign-in link.');
  }

  return (await response.json()) as RequestLinkResponse;
}

export async function verifyMagicLink(payload: VerifyRequest): Promise<VerifyResponse> {
  const response = await fetch('/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('This link is invalid or has expired.');
  }

  return (await response.json()) as VerifyResponse;
}

export async function getCurrentUser(): Promise<MeResponse | null> {
  const response = await fetch('/api/auth/me');

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to check sign-in status.');
  }

  return (await response.json()) as MeResponse;
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
}
