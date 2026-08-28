'use client';

import { useEffect } from 'react';

// Re-runs `callback` on a fixed interval while the component is mounted,
// plus immediately whenever the tab regains focus (covers the common
// "switched away and came back" case without waiting for the next tick).
// A lightweight "check for updates" mechanism — e.g. new messages — not a
// substitute for real push (WebSockets/SSE); see CLAUDE.md's messaging
// entry for why polling was chosen over those for this feature.
export function usePolling(callback: () => void, intervalMs: number, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(callback, intervalMs);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        callback();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [callback, intervalMs, enabled]);
}
