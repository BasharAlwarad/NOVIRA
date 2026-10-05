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

// The account-deletion cooling-off flow (built 2026-10-04) — replaces the
// old one-click immediate delete. See Architecture.md's "UI/UX hardening
// pass" for the full 8-step agreed flow.
export async function requestAccountDeletion(reason: string | null): Promise<{ emailSent: boolean }> {
  const response = await fetch('/api/account/delete-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });

  if (response.status === 401) {
    throw new NotSignedInError();
  }
  if (!response.ok) {
    throw new Error('Failed to start account deletion.');
  }

  return (await response.json()) as { emailSent: boolean };
}

// Public — the token itself is the auth, same as verifyMagicLink. Not
// session-gated: the email link could be opened in a different browser.
export async function confirmAccountDeletion(
  token: string,
  typedConfirmation: string
): Promise<{ scheduledFor: string }> {
  const response = await fetch('/api/account/confirm-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, typedConfirmation }),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message ?? 'Failed to confirm account deletion.');
  }

  return data as { scheduledFor: string };
}

export async function cancelAccountDeletion(): Promise<void> {
  const response = await fetch('/api/account/cancel-deletion', { method: 'POST' });

  if (response.status === 401) {
    throw new NotSignedInError();
  }
  if (!response.ok) {
    throw new Error('Failed to cancel account deletion.');
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
