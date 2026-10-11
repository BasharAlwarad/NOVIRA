import type {
  CreateOpportunityRequest,
  Opportunity,
  OpportunityStatus,
} from '@/lib/contracts/opportunities';

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

export async function syncAusbildung(adminKey: string): Promise<{ added: number }> {
  const response = await adminFetch('/api/admin/opportunities/sync-ausbildung', adminKey, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to generate Ausbildung opportunities.');
  }

  return (await response.json()) as { added: number };
}

export interface GenerateUniversityResult {
  added: number;
  fieldsResearched: number;
  fieldsSkipped: number;
  estimatedCostUsd: number;
}

export async function generateUniversity(adminKey: string): Promise<GenerateUniversityResult> {
  const response = await adminFetch('/api/admin/opportunities/generate-university', adminKey, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to generate University opportunities.');
  }

  return (await response.json()) as GenerateUniversityResult;
}

export async function createOpportunity(
  adminKey: string,
  request: CreateOpportunityRequest
): Promise<Opportunity> {
  const response = await adminFetch('/api/admin/opportunities', adminKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Failed to create opportunity.');
  }

  return (await response.json()) as Opportunity;
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

// Retires a listing without deleting it — only reachable from Approved
// (the backend rejects archiving a Pending/Denied row). A user's own
// history (applied/CV-requested) survives via the snapshot fields on
// MatchActivity/CvRequest, so this is safe to call freely.
export async function archiveOpportunity(
  adminKey: string,
  id: string,
  reason?: string
): Promise<Opportunity> {
  const response = await adminFetch(`/api/admin/opportunities/${id}/archive`, adminKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: reason ?? null }),
  });

  if (!response.ok) {
    throw new Error('Failed to archive opportunity.');
  }

  return (await response.json()) as Opportunity;
}

export interface StaleCandidate {
  opportunityId: string;
  title: string;
  provider: string;
  missCount: number;
}

export interface CheckStaleResult {
  checkedCount: number;
  candidates: StaleCandidate[];
}

// Flags likely-stale Approved Ausbildung listings for human confirmation —
// never auto-archives. See OpportunitySyncService.CheckStaleAusbildungAsync's
// own comment for why even a flagged candidate isn't a certainty (a
// high-volume employer's real listing can still miss the search API's page
// cap) — always worth a quick look before archiving, not a blind rubber
// stamp.
export async function checkStaleAusbildung(adminKey: string): Promise<CheckStaleResult> {
  const response = await adminFetch('/api/admin/opportunities/check-stale-ausbildung', adminKey, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to check for stale Ausbildung listings.');
  }

  return (await response.json()) as CheckStaleResult;
}
