import { Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// A circular medallion badge straddling a card's header/body seam, plus a
// star row under it indicating tier rank (1/2/3 stars) — the "more
// professional, not just a flat color block" treatment from round 5,
// inspired by (not copied from) the Freepik-style reference the founder
// shared: a badge + star rating conveys hierarchy even without reading the
// color. Shared by the compact Bronze/Silver cards (tier-upgrade-options.tsx)
// and the compact Gold card (tier3-request.tsx) so the three stay visually
// identical in treatment, not independently drifting copies.
export function TierBadge({
  icon: Icon,
  iconColorClass,
  starCount,
}: {
  icon: LucideIcon;
  iconColorClass: string;
  starCount: number;
}) {
  return (
    <>
      <div className="-mt-7 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-md ring-4 ring-white">
        <Icon className={`h-7 w-7 ${iconColorClass}`} />
      </div>
      <div className="mt-1.5 flex items-center justify-center gap-0.5">
        {Array.from({ length: starCount }).map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
        ))}
      </div>
    </>
  );
}
