'use client';

import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import type { CvRequestAttentionPush, NewReplyPush } from '@/lib/contracts/messages';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:5080';

// The admin counterpart to useLiveMessages.ts — closes the gap found live
// 2026-09-30: a Tier2+ user's reply only ever showed up on the admin's
// next manual page refresh. Connects with the real Admin:Key directly as
// the ticket (see MessagesHub.cs's comment on why this doesn't need the
// same short-lived-ticket indirection the user side uses — the admin
// frontend already trusts the browser with this same key for every other
// request).
//
// onCvRequestAttention (added 2026-11-08) rides the same single connection
// rather than opening a second one — this hook already holds the one admin
// SignalR connection AdminLayout keeps open for its whole lifetime, so a
// second concern (the CV-requests nav dot) listening on a second connection
// would just be two sockets doing the same job.
export function useAdminLiveMessages(
  adminKey: string | null,
  onReply: (push: NewReplyPush) => void,
  onCvRequestAttention?: (push: CvRequestAttentionPush) => void
) {
  const onReplyRef = useRef(onReply);
  const onCvRequestAttentionRef = useRef(onCvRequestAttention);

  useEffect(() => {
    onReplyRef.current = onReply;
  }, [onReply]);

  useEffect(() => {
    onCvRequestAttentionRef.current = onCvRequestAttention;
  }, [onCvRequestAttention]);

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

    connection.on('cvRequestAttention', (push: CvRequestAttentionPush) => {
      onCvRequestAttentionRef.current?.(push);
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
