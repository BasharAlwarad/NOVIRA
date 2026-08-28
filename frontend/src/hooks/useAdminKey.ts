'use client';

import { createContext, useContext } from 'react';

// Provided by app/admin/layout.tsx, which owns the actual gate (the "enter
// admin key" form) and its sessionStorage persistence — every page under
// /admin consumes it here instead of each re-implementing its own key
// state, unlock form, and 401-clearing logic (previously duplicated three
// times over across the admin pages).
export interface AdminKeyContextValue {
  adminKey: string;
  clearAdminKey: () => void;
}

export const AdminKeyContext = createContext<AdminKeyContextValue | null>(null);

export function useAdminKey(): AdminKeyContextValue {
  const context = useContext(AdminKeyContext);
  if (!context) {
    throw new Error('useAdminKey must be used within app/admin/layout.tsx.');
  }
  return context;
}
