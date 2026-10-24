export class AdminUnauthorizedError extends Error {
  constructor() {
    super('Unauthorized.');
    this.name = 'AdminUnauthorizedError';
  }
}

export interface DevMagicLink {
  email: string;
  verifyUrl: string;
  createdAt: string;
}

// Mirrors backend/Services/DevMagicLinkStore.cs — only ever has data when
// the backend is running in Development (the endpoint itself doesn't exist
// otherwise, see Program.cs's own IsDevelopment() gate).
export async function listDevMagicLinks(adminKey: string): Promise<DevMagicLink[]> {
  const response = await fetch('/api/admin/dev-magic-links', {
    headers: { 'X-Admin-Key': adminKey },
  });

  if (response.status === 401) {
    throw new AdminUnauthorizedError();
  }
  if (!response.ok) {
    throw new Error('Failed to load recent magic links.');
  }

  return (await response.json()) as DevMagicLink[];
}
