'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Round 20: a shared "dropdown with a description" collapsible wrapper —
// used for both the Germany matches map (replacing round 19's bespoke
// hide/show bar) and the Bronze/Silver/Gold upgrade cards row, so the two
// collapsible sections on /matches look and behave the same way instead of
// being two different ad-hoc patterns. Mount/unmount `children` rather than
// animate height — matters most for the map (Leaflet doesn't redraw its
// tiles correctly if its container resizes without an explicit
// map.invalidateSize() call), and is simplest to keep identical for both.
export function CollapsibleSection({
  title,
  description,
  defaultOpen = true,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
      >
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
