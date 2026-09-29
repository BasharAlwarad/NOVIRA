import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '@/lib/session-cookie';
import type { VerifySessionRequest } from '@/lib/contracts/purchases';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5080';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return Response.json({ message: 'Not signed in.' }, { status: 401 });
  }

  let body: VerifySessionRequest;
  try {
    body = (await request.json()) as VerifySessionRequest;
  } catch {
    return Response.json({ message: 'Invalid request body.' }, { status: 400 });
  }

  const backendResponse = await fetch(`${API_BASE_URL}/purchases/verify-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Token': sessionToken,
    },
    body: JSON.stringify(body),
  });

  const text = await backendResponse.text();
  const data = text ? JSON.parse(text) : null;

  return Response.json(data, { status: backendResponse.status });
}
