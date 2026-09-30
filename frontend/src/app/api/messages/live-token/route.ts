import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '@/lib/session-cookie';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5080';

// This is the one place the raw session cookie gets exchanged for a
// short-lived SignalR connection ticket — see backend/Services/
// LiveMessagingTicketStore.cs for why the browser's JS never gets the real
// session token directly.
export async function POST() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return Response.json({ message: 'Not signed in.' }, { status: 401 });
  }

  const backendResponse = await fetch(`${API_BASE_URL}/messages/live-token`, {
    method: 'POST',
    headers: { 'X-Session-Token': sessionToken },
  });

  const text = await backendResponse.text();
  const data = text ? JSON.parse(text) : null;

  return Response.json(data, { status: backendResponse.status });
}
