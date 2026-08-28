'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminKeyContext } from '@/hooks/useAdminKey';

const ADMIN_KEY_STORAGE_KEY = 'novira.admin.key';

const NAV_ITEMS = [
  { label: 'Opportunities', href: '/admin/opportunities' },
  { label: 'Users', href: '/admin/users/profiles' },
];

// The single admin gate — every /admin/* page used to duplicate this exact
// unlock form, sessionStorage read/write, and 401-clearing logic on its
// own. Centralized here so the key is entered once per browser tab (same
// sessionStorage-backed persistence as before, just no longer re-checked
// per page) and every admin page consumes it via useAdminKey(), with a
// real nav between sections instead of navigating by typing URLs.
//
// Deliberately does NOT re-prompt for the key on every page navigation —
// that would add friction without any real security gain, since the key
// sits in sessionStorage the whole time regardless of whether the UI
// re-asks for it. The actual safety valve for "don't leave this unlocked"
// is the Log out button below, not a re-auth-per-click flow.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [adminKey, setAdminKeyState] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [keyInput, setKeyInput] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAdminKeyState(window.sessionStorage.getItem(ADMIN_KEY_STORAGE_KEY));
    setChecked(true);
  }, []);

  const handleUnlock = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.sessionStorage.setItem(ADMIN_KEY_STORAGE_KEY, keyInput);
    setAdminKeyState(keyInput);
  };

  const clearAdminKey = () => {
    window.sessionStorage.removeItem(ADMIN_KEY_STORAGE_KEY);
    setAdminKeyState(null);
  };

  // Avoids a one-frame flash of the unlock form before the sessionStorage
  // read above resolves.
  if (!checked) {
    return null;
  }

  if (!adminKey) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <form
          onSubmit={handleUnlock}
          className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <h1 className="text-lg font-semibold text-slate-950">Admin access</h1>
          <p className="mt-1 text-sm text-slate-600">Enter the admin key to continue.</p>
          <input
            type="password"
            value={keyInput}
            onChange={(event) => setKeyInput(event.target.value)}
            placeholder="Admin key"
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
          />
          <button
            type="submit"
            className="mt-4 w-full rounded-full bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            Unlock
          </button>
        </form>
      </main>
    );
  }

  return (
    <AdminKeyContext.Provider value={{ adminKey, clearAdminKey }}>
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <button
              type="button"
              onClick={clearAdminKey}
              className="text-xs font-medium text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
            >
              Log out of admin
            </button>
          </div>
        </header>
        {children}
      </div>
    </AdminKeyContext.Provider>
  );
}
