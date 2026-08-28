import { cookies } from 'next/headers';
import { SESSION_COOKIE_MAX_AGE_SECONDS, SESSION_COOKIE_NAME } from '@/lib/session-cookie';
import type { VerifyRequest } from '@/lib/contracts/auth';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5080';

export async function POST(request: Request) {
  let body: VerifyRequest;
  try {
    body = (await request.json()) as VerifyRequest;
  } catch {
    return Response.json({ message: 'Invalid request body.' }, { status: 400 });
  }

  const backendResponse = await fetch(`${API_BASE_URL}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await backendResponse.text();
  const data = text ? JSON.parse(text) : null;

  if (!backendResponse.ok) {
    return Response.json(
      data ?? { message: 'This link is invalid or has expired.' },
      { status: backendResponse.status }
    );
  }

  if (typeof data?.sessionToken !== 'string') {
    // Backend returned 200 without a usable session token — shouldn't
    // happen given the current backend contract, but this must never be
    // treated as success if it ever does (previously this fell through to
    // `backendResponse.status || 400`, which evaluates to the *truthy* 200
    // here and would have returned an error body with a 200 status).
    return Response.json(
      { message: 'This link is invalid or has expired.' },
      { status: 500 }
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, data.sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  });

  // Never echo the raw session token back into the response body — from
  // here on it only lives in the HttpOnly cookie and the backend's Sessions
  // table, never somewhere client-side JS could read it.
  return Response.json({ email: data.email });
}
