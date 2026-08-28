import { isRateLimited } from '@/lib/rate-limit';
import type { RequestLinkRequest } from '@/lib/contracts/auth';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5080';

// Same shape as /leads — this sends a real email per request, so it gets
// the same tight per-visitor budget, keyed separately so it doesn't share
// /leads' bucket.
const RATE_LIMIT = { windowMs: 10 * 60 * 1000, maxRequests: 5 };

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  return forwardedFor?.split(',')[0]?.trim() || 'unknown';
}

export async function POST(request: Request) {
  const clientIp = getClientIp(request);

  if (isRateLimited(`auth-request-link:${clientIp}`, RATE_LIMIT)) {
    return Response.json(
      { message: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  let body: RequestLinkRequest;
  try {
    body = (await request.json()) as RequestLinkRequest;
  } catch {
    return Response.json({ message: 'Invalid request body.' }, { status: 400 });
  }

  const backendResponse = await fetch(`${API_BASE_URL}/auth/request-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await backendResponse.text();
  const data = text ? JSON.parse(text) : null;

  return Response.json(data, { status: backendResponse.status });
}
