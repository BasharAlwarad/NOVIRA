// Mirrors backend/Endpoints/MessagesEndpoints.cs's MessageResponse — an
// in-app message exchanged with the NOVIRA team. Originally one-way
// (admin -> user); two-way replies (Sender: 'User') were added 2026-09-30,
// gated to Tier2+ (see Message.cs's comment) — Free/Tier1 still only ever
// see Sender: 'Admin' messages.
export interface Message {
  id: string;
  subject: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  sender: 'Admin' | 'User';
}

export interface SendUserMessageRequest {
  body: string;
}

// Mirrors backend/Hubs/MessagesHub.cs's NewReplyPush — pushed to every
// connected admin when any Tier2+ user replies (added 2026-09-30).
// Includes userId, unlike the user-facing push, since one admin connection
// receives replies from every user.
export interface NewReplyPush {
  userId: string;
  message: Message;
}
