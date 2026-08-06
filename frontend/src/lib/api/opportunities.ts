import type { Opportunity, OpportunityStatus } from '@/lib/contracts/opportunities';

export class AdminUnauthorizedError extends Error {
  constructor() {
    super('Unauthorized.');
    this.name = 'AdminUnauthorizedError';
  }
}

async function adminFetch(
  path: string,
  adminKey: string,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      'X-Admin-Key': adminKey,
    },
  });

  if (response.status === 401) {
    throw new AdminUnauthorizedError();
  }

  return response;
}

export async function listOpportunities(adminKey: string): Promise<Opportunity[]> {
  const response = await adminFetch('/api/admin/opportunities', adminKey);

  if (!response.ok) {
    throw new Error('Failed to load opportunities.');
  }

  return (await response.json()) as Opportunity[];
}

export async function updateOpportunityStatus(
  adminKey: string,
  id: string,
  status: Extract<OpportunityStatus, 'Approved' | 'Denied'>
): Promise<Opportunity> {
  const response = await adminFetch(`/api/admin/opportunities/${id}`, adminKey, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error('Failed to update opportunity.');
  }

  return (await response.json()) as Opportunity;
}
