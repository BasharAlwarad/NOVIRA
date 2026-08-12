import type {
  OpportunityCountsRequest,
  OpportunityCountsResponse,
} from '@/lib/contracts/opportunity-counts';

export class RateLimitedError extends Error {
  constructor() {
    super('Rate limited.');
    this.name = 'RateLimitedError';
  }
}

export async function fetchOpportunityCounts(
  profile: OpportunityCountsRequest
): Promise<OpportunityCountsResponse> {
  const response = await fetch('/api/opportunity-counts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });

  if (response.status === 429) {
    throw new RateLimitedError();
  }

  if (!response.ok) {
    throw new Error('Failed to fetch opportunity counts.');
  }

  return (await response.json()) as OpportunityCountsResponse;
}
