const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5080';

export async function GET(request: Request) {
  const adminKey = request.headers.get('x-admin-key') ?? '';

  const backendResponse = await fetch(`${API_BASE_URL}/admin/opportunities`, {
    headers: { 'X-Admin-Key': adminKey },
  });

  const text = await backendResponse.text();
  const data = text ? JSON.parse(text) : null;

  return Response.json(data, { status: backendResponse.status });
}

export async function POST(request: Request) {
  const adminKey = request.headers.get('x-admin-key') ?? '';
  const body = await request.text();

  const backendResponse = await fetch(`${API_BASE_URL}/admin/opportunities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': adminKey,
    },
    body,
  });

  const text = await backendResponse.text();
  const data = text ? JSON.parse(text) : null;

  return Response.json(data, { status: backendResponse.status });
}
