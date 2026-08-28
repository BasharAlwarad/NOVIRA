import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '@/lib/session-cookie';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5080';

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return Response.json({ message: 'Not signed in.' }, { status: 401 });
  }

  const backendResponse = await fetch(`${API_BASE_URL}/account`, {
    headers: { 'X-Session-Token': sessionToken },
  });

  const text = await backendResponse.text();
  const data = text ? JSON.parse(text) : null;

  return Response.json(data, { status: backendResponse.status });
}

export async function DELETE() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return Response.json({ message: 'Not signed in.' }, { status: 401 });
  }

  const backendResponse = await fetch(`${API_BASE_URL}/account`, {
    method: 'DELETE',
    headers: { 'X-Session-Token': sessionToken },
  });

  // Same real-revocation-then-clear-cookie pattern as /api/auth/logout —
  // the account (and its Sessions row) is already gone server-side by the
  // time this cookie is cleared.
  cookieStore.delete(SESSION_COOKIE_NAME);

  return new Response(null, { status: backendResponse.status });
}
