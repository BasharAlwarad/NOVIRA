'use client';

import { createContext, useContext } from 'react';

// Provided by app/admin/layout.tsx, which owns the actual live SignalR
// connection (useAdminLiveMessages) and tracks WHICH users have an unseen
// reply — not a bare count. Rebuilt 2026-09-30 after the founder asked for
// a per-user note on the Users list instead of an aggregate badge on the
// nav link.
export interface AdminReplyNotificationsValue {
  unreadReplyUserIds: Set<string>;
  markUserReplySeen: (userId: string) => void;
}

export const AdminReplyNotificationsContext = createContext<AdminReplyNotificationsValue | null>(null);

export function useAdminReplyNotifications(): AdminReplyNotificationsValue {
  const context = useContext(AdminReplyNotificationsContext);
  if (!context) {
    throw new Error('useAdminReplyNotifications must be used within app/admin/layout.tsx.');
  }
  return context;
}
