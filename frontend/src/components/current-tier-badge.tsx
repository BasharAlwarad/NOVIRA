import Link from 'next/link';
import { Award, Crown, Medal, Sparkles } from 'lucide-react';
import { TierBadge } from '@/components/tier-badge';
import type { TierVariant } from '@/components/tier-badge';
import type { EffectiveTier } from '@/lib/contracts/account';

const CONFIG: Record<EffectiveTier, { label: string; variant: TierVariant; icon: typeof Sparkles }> = {
  Free: { label: 'Free', variant: 'free', icon: Sparkles },
  Tier1: { label: 'Bronze', variant: 'bronze', icon: Medal },
  Tier2: { label: 'Silver', variant: 'silver', icon: Award },
  Tier3: { label: 'Gold', variant: 'gold', icon: Crown },
};

// A small inline "what plan am I on" indicator — the same medallion badge
// (TierBadge) already used on the Bronze/Silver/Gold/Free cards everywhere
// else, shrunk to a pill instead of a full card. Replaces /account's old
// large gradient-header "Your current plan" banner (found live 2026-11-01:
// too much vertical space for what's really a one-line status) — moved
// under the "Account settings" dropdown instead. Links to /#services, the
// same destination the nav's own plain-text tier pill already uses for
// "what do I get at this level."
export function CurrentTierBadge({ effectiveTier }: { effectiveTier: EffectiveTier }) {
  const config = CONFIG[effectiveTier];

  return (
    <Link
      href="/#services"
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1.5 pr-3 shadow-sm transition hover:shadow-md"
    >
      <TierBadge icon={config.icon} variant={config.variant} size="xs" />
      <span className="text-xs font-semibold text-slate-700">{config.label}</span>
    </Link>
  );
}
