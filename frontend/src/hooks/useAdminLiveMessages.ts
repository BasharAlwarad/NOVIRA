'use client';

import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import type { NewReplyPush } from '@/lib/contracts/messages';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:5080';

// The admin counterpart to useLiveMessages.ts — closes the gap found live
// 2026-09-30: a Tier2+ user's reply only ever showed up on the admin's
// next manual page refresh. Connects with the real Admin:Key directly as
// the ticket (see MessagesHub.cs's comment on why this doesn't need the
// same short-lived-ticket indirection the user side uses — the admin
// frontend already trusts the browser with this same key for every other
// request).
export function useAdminLiveMessages(adminKey: string | null, onReply: (push: NewReplyPush) => void) {
  const onReplyRef = useRef(onReply);

  useEffect(() => {
    onReplyRef.current = onReply;
  }, [onReply]);

  useEffect(() => {
    if (!adminKey) {
      return;
    }

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${BACKEND_URL}/hubs/messages`, {
        accessTokenFactory: () => adminKey,
        withCredentials: false,
      })
      .withAutomaticReconnect()
      .build();

    connection.on('newReply', (push: NewReplyPush) => {
      onReplyRef.current(push);
    });

    connection.start().catch(() => {
      // Best-effort — a failed live connection just means this admin
      // session falls back to manual refresh, not worth a hard error.
    });

    return () => {
      connection.stop();
    };
  }, [adminKey]);
}
