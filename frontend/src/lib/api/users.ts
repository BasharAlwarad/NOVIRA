import type { User } from '@/lib/contracts/user';

export const usersApiPath = '/api/users';
export const defaultApiBaseUrl =
  process.env.API_BASE_URL ?? 'http://localhost:5080';

export async function fetchUsers(
  apiBaseUrl: string = defaultApiBaseUrl
): Promise<User[]> {
  const response = await fetch(`${apiBaseUrl}${usersApiPath}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to load users (${response.status})`);
  }

  return response.json() as Promise<User[]>;
}
