import type { CvRequest } from '@/lib/contracts/cv-requests';

export class NotSignedInError extends Error {
  constructor() {
    super('Not signed in.');
    this.name = 'NotSignedInError';
  }
}

export async function listMyCvRequests(): Promise<CvRequest[]> {
  const response = await fetch('/api/cv-requests');

  if (response.status === 401) {
    throw new NotSignedInError();
  }
  if (!response.ok) {
    throw new Error('Failed to load your CV requests.');
  }

  return (await response.json()) as CvRequest[];
}

export async function requestCv(opportunityId: string): Promise<CvRequest> {
  const response = await fetch('/api/cv-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ opportunityId }),
  });

  if (response.status === 401) {
    throw new NotSignedInError();
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error((body as { message?: string } | null)?.message ?? 'Failed to request a CV.');
  }

  return (await response.json()) as CvRequest;
}
