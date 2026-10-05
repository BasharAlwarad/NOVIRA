const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5080';

// Deliberately no session-cookie check here, unlike every other /api/account
// route — the deletion token itself is the authentication (same as
// /api/auth/verify), since the confirmation email link could legitimately
// be opened in a different browser than the one that requested it.
export async function POST(request: Request) {
  const body = await request.text();

  const backendResponse = await fetch(`${API_BASE_URL}/account/confirm-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  const text = await backendResponse.text();
  const data = text ? JSON.parse(text) : null;

  return Response.json(data, { status: backendResponse.status });
}
