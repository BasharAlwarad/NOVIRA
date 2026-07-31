import { isRateLimited } from '@/lib/rate-limit';
import type { SaveResultRequest } from '@/lib/contracts/leads';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5080';

const RATE_LIMIT = { windowMs: 10 * 60 * 1000, maxRequests: 5 };

function getClientIp(request: Request): string {
  // Populated by whatever sits in front of this app (Vercel, nginx, etc.);
  // absent in plain local dev, where every request falls into one bucket.
  const forwardedFor = request.headers.get('x-forwarded-for');
  return forwardedFor?.split(',')[0]?.trim() || 'unknown';
}

export async function POST(request: Request) {
  const clientIp = getClientIp(request);

  if (isRateLimited(clientIp, RATE_LIMIT)) {
    return Response.json(
      { message: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  let body: SaveResultRequest;
  try {
    body = (await request.json()) as SaveResultRequest;
  } catch {
    return Response.json({ message: 'Invalid request body.' }, { status: 400 });
  }

  const backendResponse = await fetch(`${API_BASE_URL}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await backendResponse.json();

  return Response.json(data, { status: backendResponse.status });
}
