'use client';

import { createContext, useContext } from 'react';

// Provided by app/admin/layout.tsx, which owns the actual live SignalR
// connection (useAdminLiveMessages) and tracks WHICH users have an unseen
// reply — not a bare count. Rebuilt 2026-09-30 after the founder asked for
// a per-user note on the Users list instead of an aggregate badge on the
// nav link.
//
// cvRequestsNeedingAttention/clearCvRequestsAttention (added 2026-11-08)
// carry the same idea for the CV-requests nav dot — kept on this same
// context rather than a third one, since both are "live admin attention
// signals owned by the one SignalR connection in this layout." Unlike the
// per-user reply flag, this one clears all at once on visiting
// /admin/cv-requests (a "mark the whole queue as seen" semantics, not
// per-card) — simpler, and matches how a founder actually uses that page.
export interface AdminReplyNotificationsValue {
  unreadReplyUserIds: Set<string>;
  markUserReplySeen: (userId: string) => void;
  cvRequestsNeedingAttention: Set<string>;
  clearCvRequestsAttention: () => void;
}

export const AdminReplyNotificationsContext = createContext<AdminReplyNotificationsValue | null>(null);

export function useAdminReplyNotifications(): AdminReplyNotificationsValue {
  const context = useContext(AdminReplyNotificationsContext);
  if (!context) {
    throw new Error('useAdminReplyNotifications must be used within app/admin/layout.tsx.');
  }
  return context;
}
