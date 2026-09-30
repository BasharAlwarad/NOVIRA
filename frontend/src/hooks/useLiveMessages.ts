'use client';

import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { requestLiveMessagingTicket } from '@/lib/api/messages';
import type { Message } from '@/lib/contracts/messages';
import type { EffectiveTier } from '@/lib/contracts/account';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:5080';

// Tier2+ only (see backend/Models/Message.cs's comment) — for Free/Tier1,
// this hook does nothing at all, and the existing 45s poll (SiteNav's own
// usePolling call) is untouched. Deliberately scoped to "admin sends, user
// gets it live" only for this first pass — a Tier2+ user's own reply
// pushing live to the admin dashboard is a separate, explicitly deferred
// step (see MessagesHub.cs's comment).
export function useLiveMessages(effectiveTier: EffectiveTier | null, onMessage: (message: Message) => void) {
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (effectiveTier !== 'Tier2' && effectiveTier !== 'Tier3') {
      return;
    }

    let cancelled = false;
    let connection: signalR.HubConnection | null = null;

    async function connect() {
      // A fresh ticket per connection attempt (including reconnects) — see
      // LiveMessagingTicketStore.cs, tickets are single-use and expire in
      // 30 seconds, so nothing here tries to reuse one.
      const ticket = await requestLiveMessagingTicket().catch(() => null);
      if (cancelled || !ticket) {
        return;
      }

      connection = new signalR.HubConnectionBuilder()
        .withUrl(`${BACKEND_URL}/hubs/messages`, {
          accessTokenFactory: () => ticket,
          // Auth here is entirely the ticket above, not cookies — without
          // this, the client's default credentials:'include' fetch forces
          // the backend's CORS policy to also set
          // Access-Control-Allow-Credentials, which it deliberately
          // doesn't (no cookie is ever meant to cross this boundary).
          // Found live 2026-09-30: omitting this caused real (if
          // eventually self-recovering via automatic reconnect) CORS
          // failures on every connection attempt.
          withCredentials: false,
        })
        .withAutomaticReconnect()
        .build();

      connection.on('newMessage', (message: Message) => {
        onMessageRef.current(message);
      });

      try {
        await connection.start();
      } catch {
        // Best-effort — a failed live connection just means this session
        // falls back to whatever the page already does on its own (a
        // manual refresh), not worth surfacing as a hard error over.
      }
    }

    connect();

    return () => {
      cancelled = true;
      connection?.stop();
    };
  }, [effectiveTier]);
}
