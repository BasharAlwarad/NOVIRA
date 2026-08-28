import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '@/lib/session-cookie';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5080';

export async function POST() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    // Real server-side revocation (deletes the Sessions row) — not just a
    // client-side cookie clear, so a copy of the token made before logout
    // stops working immediately too.
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'X-Session-Token': sessionToken },
    }).catch(() => {
      // Best-effort — the cookie gets cleared below regardless, so the
      // browser is logged out even if this call fails.
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);

  return Response.json({ loggedOut: true });
}
