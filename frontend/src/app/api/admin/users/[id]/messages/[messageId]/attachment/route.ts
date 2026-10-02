const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5080';

// Admin counterpart of /api/messages/[id]/attachment — lets the founder
// re-download exactly what was sent to a user. The {id} (userId) segment is
// unused by the backend call (ownership isn't checked admin-side, see
// MessagesEndpoints.cs's GET /admin/messages/{id}/attachment) but kept in
// the route shape for consistency with the other admin/users/[id]/... routes.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const { messageId } = await params;
  const adminKey = request.headers.get('x-admin-key') ?? '';

  const backendResponse = await fetch(`${API_BASE_URL}/admin/messages/${messageId}/attachment`, {
    headers: { 'X-Admin-Key': adminKey },
  });

  const text = await backendResponse.text();
  const data = text ? JSON.parse(text) : null;

  return Response.json(data, { status: backendResponse.status });
}
