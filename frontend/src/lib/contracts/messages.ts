// Mirrors backend/Endpoints/MessagesEndpoints.cs's MessageResponse — an
// in-app message from the NOVIRA team, the replacement for what used to be
// a document-decision or admin free-text email (see DocumentsAdminEndpoints.cs).
// One-way (admin -> user) for now; no reply.
export interface Message {
  id: string;
  subject: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}
