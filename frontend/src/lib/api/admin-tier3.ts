import type { AdminTier3Case, Tier3CaseStatus } from '@/lib/contracts/tier3';

export class AdminUnauthorizedError extends Error {
  constructor() {
    super('Unauthorized.');
    this.name = 'AdminUnauthorizedError';
  }
}

async function adminFetch(path: string, adminKey: string, init?: RequestInit): Promise<Response> {
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

export async function listTier3Cases(adminKey: string): Promise<AdminTier3Case[]> {
  const response = await adminFetch('/api/admin/tier3-cases', adminKey);
  if (!response.ok) {
    throw new Error('Failed to load Tier 3 cases.');
  }
  return (await response.json()) as AdminTier3Case[];
}

export async function updateTier3Case(
  adminKey: string,
  id: string,
  update: { status?: Tier3CaseStatus; adminNotes?: string; targetOpportunityId?: string }
): Promise<AdminTier3Case> {
  const response = await adminFetch(`/api/admin/tier3-cases/${id}`, adminKey, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: update.status ?? null,
      adminNotes: update.adminNotes ?? null,
      targetOpportunityId: update.targetOpportunityId ?? null,
    }),
  });
  if (!response.ok) {
    throw new Error('Failed to update that case.');
  }
  return (await response.json()) as AdminTier3Case;
}

export async function sendTier3Agreement(adminKey: string, id: string): Promise<AdminTier3Case> {
  const response = await adminFetch(`/api/admin/tier3-cases/${id}/send-agreement`, adminKey, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to send the agreement.');
  }
  return (await response.json()) as AdminTier3Case;
}

export async function requestTier3SuccessFee(adminKey: string, id: string): Promise<AdminTier3Case> {
  const response = await adminFetch(`/api/admin/tier3-cases/${id}/request-success-fee`, adminKey, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to request the success fee.');
  }
  return (await response.json()) as AdminTier3Case;
}
