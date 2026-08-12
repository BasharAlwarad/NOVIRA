import { isRateLimited } from '@/lib/rate-limit';
import type { ProfileSnapshot } from '@/lib/contracts/leads';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5080';

// Looser than /leads' 5/10min — this is a read-only preview a visitor might
// legitimately trigger a few times while revisiting the result page, not an
// email-send action. Keyed with a route-specific prefix so it doesn't share
// a budget with /leads' rate limiter (both read the same in-memory map).
const RATE_LIMIT = { windowMs: 10 * 60 * 1000, maxRequests: 20 };

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  return forwardedFor?.split(',')[0]?.trim() || 'unknown';
}

export async function POST(request: Request) {
  const clientIp = getClientIp(request);

  if (isRateLimited(`counts:${clientIp}`, RATE_LIMIT)) {
    return Response.json(
      { message: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  let body: ProfileSnapshot;
  try {
    body = (await request.json()) as ProfileSnapshot;
  } catch {
    return Response.json({ message: 'Invalid request body.' }, { status: 400 });
  }

  const backendResponse = await fetch(`${API_BASE_URL}/opportunity-counts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await backendResponse.text();
  const data = text ? JSON.parse(text) : null;

  return Response.json(data, { status: backendResponse.status });
}
