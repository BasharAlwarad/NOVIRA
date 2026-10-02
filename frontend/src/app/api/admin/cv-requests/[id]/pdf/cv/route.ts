const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5080';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const adminKey = request.headers.get('x-admin-key') ?? '';

  const backendResponse = await fetch(`${API_BASE_URL}/admin/cv-requests/${id}/pdf/cv`, {
    headers: { 'X-Admin-Key': adminKey },
  });

  if (!backendResponse.ok) {
    const text = await backendResponse.text();
    const data = text ? JSON.parse(text) : null;
    return Response.json(data, { status: backendResponse.status });
  }

  const bytes = await backendResponse.arrayBuffer();
  return new Response(bytes, {
    status: 200,
    headers: { 'Content-Type': 'application/pdf' },
  });
}
