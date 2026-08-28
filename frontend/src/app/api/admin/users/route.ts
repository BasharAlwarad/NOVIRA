const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5080';

export async function GET(request: Request) {
  const adminKey = request.headers.get('x-admin-key') ?? '';
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');

  const url = new URL(`${API_BASE_URL}/admin/users`);
  if (search) {
    url.searchParams.set('search', search);
  }

  const backendResponse = await fetch(url, {
    headers: { 'X-Admin-Key': adminKey },
  });

  const text = await backendResponse.text();
  const data = text ? JSON.parse(text) : null;

  return Response.json(data, { status: backendResponse.status });
}
