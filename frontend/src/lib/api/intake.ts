import type { IntakeGetResponse, IntakeProfile, SaveIntakeRequest } from '@/lib/contracts/intake';

export class NotSignedInError extends Error {
  constructor() {
    super('Not signed in.');
    this.name = 'NotSignedInError';
  }
}

export async function fetchMyIntake(): Promise<IntakeGetResponse> {
  const response = await fetch('/api/intake');

  if (response.status === 401) {
    throw new NotSignedInError();
  }
  if (!response.ok) {
    throw new Error('Failed to load your CV profile.');
  }

  return (await response.json()) as IntakeGetResponse;
}

export async function saveMyIntake(request: SaveIntakeRequest): Promise<IntakeProfile> {
  const response = await fetch('/api/intake', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (response.status === 401) {
    throw new NotSignedInError();
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error((body as { message?: string } | null)?.message ?? 'Failed to save — try again.');
  }

  return (await response.json()) as IntakeProfile;
}

export async function submitMyIntake(): Promise<IntakeProfile> {
  const response = await fetch('/api/intake/submit', { method: 'POST' });

  if (response.status === 401) {
    throw new NotSignedInError();
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error((body as { message?: string } | null)?.message ?? 'Failed to submit — try again.');
  }

  return (await response.json()) as IntakeProfile;
}

export async function uploadMyIntakePhoto(file: File): Promise<IntakeProfile> {
  const form = new FormData();
  form.append('file', file, file.name);

  const response = await fetch('/api/intake/photo', { method: 'POST', body: form });

  if (response.status === 401) {
    throw new NotSignedInError();
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error((body as { message?: string } | null)?.message ?? 'Failed to upload photo.');
  }

  return (await response.json()) as IntakeProfile;
}

export async function fetchMyIntakePhotoUrl(): Promise<string | null> {
  const response = await fetch('/api/intake/photo');

  if (response.status === 404) {
    return null;
  }
  if (response.status === 401) {
    throw new NotSignedInError();
  }
  if (!response.ok) {
    throw new Error('Failed to load your photo.');
  }

  const body = (await response.json()) as { url: string };
  return body.url;
}

export async function deleteMyIntakePhoto(): Promise<void> {
  const response = await fetch('/api/intake/photo', { method: 'DELETE' });

  if (response.status === 401) {
    throw new NotSignedInError();
  }
  if (!response.ok) {
    throw new Error('Failed to remove photo.');
  }
}
