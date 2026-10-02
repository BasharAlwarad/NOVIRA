import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '@/lib/session-cookie';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5080';

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return Response.json({ message: 'Not signed in.' }, { status: 401 });
  }

  const backendResponse = await fetch(`${API_BASE_URL}/intake/photo`, {
    headers: { 'X-Session-Token': sessionToken },
  });

  const text = await backendResponse.text();
  const data = text ? JSON.parse(text) : null;

  return Response.json(data, { status: backendResponse.status });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return Response.json({ message: 'Not signed in.' }, { status: 401 });
  }

  // Re-buffered into a fresh FormData rather than streamed straight through
  // — same reasoning as api/documents/route.ts's POST.
  const incomingForm = await request.formData();
  const file = incomingForm.get('file');

  if (!(file instanceof File)) {
    return Response.json({ message: 'Missing file.' }, { status: 400 });
  }

  const outgoingForm = new FormData();
  outgoingForm.append('file', file, file.name);

  const backendResponse = await fetch(`${API_BASE_URL}/intake/photo`, {
    method: 'POST',
    headers: { 'X-Session-Token': sessionToken },
    body: outgoingForm,
  });

  const text = await backendResponse.text();
  const data = text ? JSON.parse(text) : null;

  return Response.json(data, { status: backendResponse.status });
}

export async function DELETE() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return Response.json({ message: 'Not signed in.' }, { status: 401 });
  }

  const backendResponse = await fetch(`${API_BASE_URL}/intake/photo`, {
    method: 'DELETE',
    headers: { 'X-Session-Token': sessionToken },
  });

  return new Response(null, { status: backendResponse.status });
}
