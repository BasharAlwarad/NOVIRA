import type { Account } from '@/lib/contracts/account';
import type { ProfileSnapshot } from '@/lib/contracts/leads';

export class NotSignedInError extends Error {
  constructor() {
    super('Not signed in.');
    this.name = 'NotSignedInError';
  }
}

export async function fetchMyAccount(): Promise<Account> {
  const response = await fetch('/api/account');

  if (response.status === 401) {
    throw new NotSignedInError();
  }
  if (!response.ok) {
    throw new Error('Failed to load your account.');
  }

  return (await response.json()) as Account;
}

export async function deleteMyAccount(): Promise<void> {
  const response = await fetch('/api/account', { method: 'DELETE' });

  if (!response.ok) {
    throw new Error('Failed to delete your account.');
  }
}

// Syncs the caller's current (already-authenticated) account with a freshly
// computed profile snapshot — the missing path for someone who signed in
// FIRST and only completed the assessment afterward, while already signed
// in (found live 2026-08-30; see SignupPrompt.tsx and
// backend/Endpoints/AccountEndpoints.cs's POST /profile).
export async function updateMyProfile(profile: ProfileSnapshot): Promise<{ hasProfile: boolean }> {
  const response = await fetch('/api/account/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });

  if (response.status === 401) {
    throw new NotSignedInError();
  }
  if (!response.ok) {
    throw new Error('Failed to sync your profile.');
  }

  return (await response.json()) as { hasProfile: boolean };
}
