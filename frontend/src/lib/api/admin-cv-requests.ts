import type { AdminCvRequest, CvDraftResult, CvRequestStatus } from '@/lib/contracts/cv-requests';

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

export async function listCvRequests(adminKey: string): Promise<AdminCvRequest[]> {
  const response = await adminFetch('/api/admin/cv-requests', adminKey);
  if (!response.ok) {
    throw new Error('Failed to load CV requests.');
  }
  return (await response.json()) as AdminCvRequest[];
}

export async function updateCvRequestStatus(
  adminKey: string,
  id: string,
  status: CvRequestStatus
): Promise<AdminCvRequest> {
  const response = await adminFetch(`/api/admin/cv-requests/${id}`, adminKey, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error('Failed to update that request.');
  }
  return (await response.json()) as AdminCvRequest;
}

export async function fetchCvDraft(adminKey: string, id: string): Promise<CvDraftResult> {
  const response = await adminFetch(`/api/admin/cv-requests/${id}/draft`, adminKey);
  if (!response.ok) {
    throw new Error('Failed to load the draft.');
  }
  return (await response.json()) as CvDraftResult;
}

export async function generateCvDraft(adminKey: string, id: string): Promise<CvDraftResult> {
  const response = await adminFetch(`/api/admin/cv-requests/${id}/generate`, adminKey, { method: 'POST' });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error((body as { message?: string } | null)?.message ?? 'Failed to generate a draft.');
  }
  return (await response.json()) as CvDraftResult;
}

export async function reviseCvDraft(adminKey: string, id: string, feedback: string): Promise<CvDraftResult> {
  const response = await adminFetch(`/api/admin/cv-requests/${id}/revise`, adminKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error((body as { message?: string } | null)?.message ?? 'Failed to revise the draft.');
  }
  return (await response.json()) as CvDraftResult;
}

// Renders both PDFs, uploads them, and sends them to the user as real
// message attachments — the actual delivery step (built 2026-10-02, closing
// the gap where "Mark delivered" was a pure status flag with no real send).
// Requires a generated draft first; the backend 400s with an explanatory
// message otherwise.
export async function deliverCvRequest(adminKey: string, id: string): Promise<AdminCvRequest> {
  const response = await adminFetch(`/api/admin/cv-requests/${id}/deliver`, adminKey, { method: 'POST' });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error((body as { message?: string } | null)?.message ?? 'Failed to deliver the CV.');
  }
  return (await response.json()) as AdminCvRequest;
}

// Returns the raw generated-PDF bytes as a Blob — not a pre-made object URL.
// The endpoint itself is admin-key-protected (a header, not a query param),
// so a plain <a href> can't hit it directly. Deliberately NOT converted to
// a URL here: a blob: URL is scoped to whichever document's registry
// created it, so creating it in this module (the opener's realm) and then
// trying to navigate a *different* popup window to it silently fails (found
// live 2026-10-02) — openInNewTabAfterFetch creates the object URL itself,
// in the popup's own realm, right before navigating it.
async function fetchPdfBlob(adminKey: string, path: string): Promise<Blob> {
  const response = await adminFetch(path, adminKey);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error((body as { message?: string } | null)?.message ?? 'Failed to load the PDF.');
  }
  return response.blob();
}

export function fetchCvPdfBlob(adminKey: string, id: string): Promise<Blob> {
  return fetchPdfBlob(adminKey, `/api/admin/cv-requests/${id}/pdf/cv`);
}

export function fetchCoverLetterPdfBlob(adminKey: string, id: string): Promise<Blob> {
  return fetchPdfBlob(adminKey, `/api/admin/cv-requests/${id}/pdf/cover-letter`);
}

export async function setCvReferenceExample(
  adminKey: string,
  id: string,
  isReferenceExample: boolean
): Promise<AdminCvRequest> {
  const response = await adminFetch(`/api/admin/cv-requests/${id}/reference-example`, adminKey, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isReferenceExample }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error((body as { message?: string } | null)?.message ?? 'Failed to update the reference-example flag.');
  }
  return (await response.json()) as AdminCvRequest;
}
