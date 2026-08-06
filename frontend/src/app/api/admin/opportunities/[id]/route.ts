const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5080';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const adminKey = request.headers.get('x-admin-key') ?? '';
  const body = await request.text();

  const backendResponse = await fetch(`${API_BASE_URL}/admin/opportunities/${id}`, {
    method: 'PATCH',
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
