import type { SaveResultRequest, SaveResultResponse } from '@/lib/contracts/leads';

export class RateLimitedError extends Error {
  constructor() {
    super('Rate limited.');
    this.name = 'RateLimitedError';
  }
}

export async function saveResult(
  payload: SaveResultRequest
): Promise<SaveResultResponse> {
  const response = await fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (response.status === 429) {
    throw new RateLimitedError();
  }

  if (!response.ok) {
    throw new Error('Failed to save result.');
  }

  return (await response.json()) as SaveResultResponse;
}
