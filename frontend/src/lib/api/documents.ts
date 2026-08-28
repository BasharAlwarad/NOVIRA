import type { UserDocumentSummary } from '@/lib/contracts/documents';

export class NotSignedInError extends Error {
  constructor() {
    super('Not signed in.');
    this.name = 'NotSignedInError';
  }
}

export async function listMyDocuments(): Promise<UserDocumentSummary[]> {
  const response = await fetch('/api/documents');

  if (response.status === 401) {
    throw new NotSignedInError();
  }
  if (!response.ok) {
    throw new Error('Failed to load your documents.');
  }

  return (await response.json()) as UserDocumentSummary[];
}

// documentType is no longer chosen by the uploader — the AI determines it
// from what the document actually is (see backend/Models/UserDocument.cs).
// name is the user's own label for the document and is required.
export async function uploadDocument(file: File, name: string): Promise<UserDocumentSummary> {
  const form = new FormData();
  form.append('file', file, file.name);
  form.append('name', name);

  const response = await fetch('/api/documents', { method: 'POST', body: form });

  if (response.status === 401) {
    throw new NotSignedInError();
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error((body as { message?: string } | null)?.message ?? 'Failed to upload document.');
  }

  return (await response.json()) as UserDocumentSummary;
}
