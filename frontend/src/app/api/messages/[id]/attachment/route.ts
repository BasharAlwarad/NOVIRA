import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '@/lib/session-cookie';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5080';

// Redirects straight to a fresh short-lived SAS URL for a message's
// attachment — a real 302, not a JSON body, specifically so the account
// page can link to this route with a plain <a href>/<a target="_blank">
// instead of a JS fetch-then-window.open(). Found live 2026-10-02: a real
// browser's popup blocker silently swallowed window.open() calls made after
// an await (the gap between the fetch resolving and the call landing was
// enough to lose "direct user gesture" status in some browsers, even though
// Playwright's own default context doesn't enforce that and missed it
// during verification) — a genuine anchor click sidesteps the problem
// entirely since the browser treats it as a real navigation, not a script-
// initiated popup. See MessagesEndpoints.cs's GET /messages/{id}/attachment,
// which now also sets a Content-Disposition via the SAS so this is a real
// download, not an inline view.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return Response.json({ message: 'Not signed in.' }, { status: 401 });
  }

  const backendResponse = await fetch(`${API_BASE_URL}/messages/${id}/attachment`, {
    headers: { 'X-Session-Token': sessionToken },
  });

  const text = await backendResponse.text();
  const data = text ? JSON.parse(text) : null;

  if (!backendResponse.ok || !data?.url) {
    return Response.json(data, { status: backendResponse.status });
  }

  return Response.redirect(data.url, 302);
}
