import { Award, Crown, Medal, Sparkles } from 'lucide-react';
import type { TierVariant } from '@/components/tier-badge';
import type { EffectiveTier } from '@/lib/contracts/account';

// The EffectiveTier → medallion icon/variant mapping, shared by SiteNav's
// account-menu medallion (the only place this renders now — see its own
// AccountNavMenu comment). Used to live alongside a standalone
// CurrentTierBadge component rendered a second time on /account's own page
// header; removed 2026-11-07 once that became a literal duplicate of the
// nav's own medallion, visible in the same viewport at the same time.
export const EFFECTIVE_TIER_ICON_CONFIG: Record<
  EffectiveTier,
  { label: string; variant: TierVariant; icon: typeof Sparkles }
> = {
  Free: { label: 'Free', variant: 'free', icon: Sparkles },
  Tier1: { label: 'Bronze', variant: 'bronze', icon: Medal },
  Tier2: { label: 'Silver', variant: 'silver', icon: Award },
  Tier3: { label: 'Gold', variant: 'gold', icon: Crown },
};
