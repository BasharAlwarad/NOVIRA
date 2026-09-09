import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '@/lib/session-cookie';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5080';

// Closes the "already signed in, completed the assessment after" gap — see
// backend/Endpoints/AccountEndpoints.cs's POST /profile for the full story.
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return Response.json({ message: 'Not signed in.' }, { status: 401 });
  }

  const body = await request.text();

  const backendResponse = await fetch(`${API_BASE_URL}/account/profile`, {
    method: 'POST',
    headers: { 'X-Session-Token': sessionToken, 'Content-Type': 'application/json' },
    body,
  });

  const text = await backendResponse.text();
  const data = text ? JSON.parse(text) : null;

  return Response.json(data, { status: backendResponse.status });
}
