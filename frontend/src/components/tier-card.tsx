import Link from 'next/link';
import { Award, CheckCircle2, Crown, Medal, Sparkles } from 'lucide-react';
import { TierBadge } from '@/components/tier-badge';
import type { TierVariant } from '@/components/tier-badge';

const VARIANT_CONFIG: Record<
  TierVariant,
  {
    label: string;
    icon: typeof Sparkles;
    gradient: string;
    nameTextColor: string;
    labelColor: string;
    checkColor: string;
  }
> = {
  free: {
    label: 'Free',
    icon: Sparkles,
    gradient: 'from-slate-300 to-slate-200',
    nameTextColor: 'text-slate-800',
    labelColor: 'text-slate-600',
    checkColor: 'text-slate-500',
  },
  bronze: {
    label: 'Bronze',
    icon: Medal,
    gradient: 'from-amber-800 to-amber-700',
    nameTextColor: 'text-white',
    labelColor: 'text-amber-100',
    checkColor: 'text-amber-700',
  },
  silver: {
    label: 'Silver',
    icon: Award,
    gradient: 'from-slate-600 to-slate-500',
    nameTextColor: 'text-white',
    labelColor: 'text-slate-100',
    checkColor: 'text-slate-500',
  },
  gold: {
    label: 'Gold',
    icon: Crown,
    gradient: 'from-yellow-600 to-yellow-500',
    nameTextColor: 'text-white',
    labelColor: 'text-yellow-100',
    checkColor: 'text-yellow-700',
  },
};

// Shared bullet copy for the tiers whose wording doesn't change between
// contexts — Bronze is the one exception (its first bullet is a dynamic
// match count on /matches but a static "Unlock every match" on the
// homepage), so callers build that one bullet list themselves, prepending
// their own first line to BRONZE_BULLETS_TAIL.
export const BRONZE_BULLETS_TAIL = ['Human review of your profile', 'Compare against real requirements'];
export const SILVER_BULLETS = [
  'CV & cover letter per application',
  'Interview preparation',
  'Direct team messaging',
  'Priority match alerts',
];
export const GOLD_BULLETS = ['Full application help', 'Signed agreement first', 'Ongoing case support'];
export const FREE_BULLETS = ['Personalized verdict', 'One real match', 'No signup required'];

// One shared tile for every Free/Bronze/Silver/Gold card in the app — the
// homepage's /#services strip, the compact upgrade cards on /matches and
// /account (tier-upgrade-options.tsx, tier3-request.tsx's idle state) all
// render through this now instead of three independently hand-maintained
// copies of the same gradient-header/badge/bullet-list/button markup
// (found live 2026-10-31: three rounds of "shrink the cards"/"drop the
// heading" each had to be applied three times by hand). Price text and
// bullet copy still come from the caller — they genuinely differ by
// context (Bronze's bullet count is dynamic on /matches, Silver's price
// reflects a per-user carry-up discount, Gold's price reads "from €X" in
// the compact card but "€X + €Y" on the homepage) — this only owns the
// shared visual shell, so a future sizing/spacing tweak only needs to
// change one file.
export function TierCard({
  variant,
  price,
  bullets,
  href,
  ctaLabel = 'Read more',
  fixedWidth = false,
}: {
  variant: TierVariant;
  // Omitted for Free, which has no price line.
  price?: string;
  bullets: string[];
  href: string;
  ctaLabel?: string;
  // Default (false): flex-1/min-w-48, grows to fill its CSS Grid track —
  // what the homepage's always-4-cards /#services grid wants. true: a
  // fixed width that doesn't grow — added 2026-11-06 for the /matches and
  // /account "Upgrade options" row, which can show fewer than 3 cards
  // (e.g. a Tier1 user only sees Silver+Gold); that row is a flex
  // container with `justify-center`, which only has something to center
  // once the cards stop growing to fill 100% of the row.
  fixedWidth?: boolean;
}) {
  const config = VARIANT_CONFIG[variant];
  const sizeClass = fixedWidth ? 'w-full sm:w-52 sm:flex-none' : 'min-w-48 flex-1';

  return (
    <div
      className={`relative flex ${sizeClass} flex-col overflow-hidden rounded-3xl bg-white shadow-sm transition-shadow duration-200 hover:shadow-lg`}
    >
      <div className={`bg-linear-to-br ${config.gradient} px-5 pt-5 pb-9`}>
        <p className={`text-sm font-semibold ${config.nameTextColor}`}>
          <span className={`uppercase tracking-[0.2em] ${config.labelColor}`}>{config.label}</span>
          {price ? ` — ${price}` : null}
        </p>
      </div>
      <div className="flex flex-1 flex-col p-4 pt-0">
        <TierBadge icon={config.icon} variant={variant} />
        <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-1.5">
              <CheckCircle2 className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${config.checkColor}`} />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-3">
          <Link
            href={href}
            className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
