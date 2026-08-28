import type { Account } from '@/lib/contracts/account';

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
