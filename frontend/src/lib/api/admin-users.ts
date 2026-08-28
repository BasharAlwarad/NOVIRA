import type {
  AdminUserDetail,
  AdminUserListItem,
  ReviewDocumentRequest,
  SendMessageRequest,
} from '@/lib/contracts/admin-users';
import type { AdminDocument } from '@/lib/contracts/admin-users';

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

export async function listUsers(adminKey: string, search?: string): Promise<AdminUserListItem[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const response = await adminFetch(`/api/admin/users${query}`, adminKey);

  if (!response.ok) {
    throw new Error('Failed to load users.');
  }

  return (await response.json()) as AdminUserListItem[];
}

export async function getUserDetail(adminKey: string, userId: string): Promise<AdminUserDetail> {
  const response = await adminFetch(`/api/admin/users/${userId}`, adminKey);

  if (!response.ok) {
    throw new Error('Failed to load that user.');
  }

  return (await response.json()) as AdminUserDetail;
}

export async function reviewDocument(
  adminKey: string,
  userId: string,
  documentId: string,
  request: ReviewDocumentRequest
): Promise<AdminDocument> {
  const response = await adminFetch(`/api/admin/users/${userId}/documents/${documentId}`, adminKey, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Failed to update that document.');
  }

  return (await response.json()) as AdminDocument;
}

// Catch-up for documents that were Approved before verified-data promotion
// existed (2026-08-16) — see the comment on the backend endpoint. Safe to
// call repeatedly.
export async function recomputeVerifiedData(adminKey: string, userId: string): Promise<AdminUserDetail> {
  const response = await adminFetch(`/api/admin/users/${userId}/recompute-verified-data`, adminKey, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to recompute verified data.');
  }

  return (await response.json()) as AdminUserDetail;
}

export async function deleteUser(adminKey: string, userId: string): Promise<void> {
  const response = await adminFetch(`/api/admin/users/${userId}`, adminKey, { method: 'DELETE' });

  if (!response.ok) {
    throw new Error('Failed to delete that account.');
  }
}

export async function sendMessageToUser(
  adminKey: string,
  userId: string,
  request: SendMessageRequest
): Promise<{ sent: boolean }> {
  const response = await adminFetch(`/api/admin/users/${userId}/message`, adminKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Failed to send message.');
  }

  return (await response.json()) as { sent: boolean };
}
