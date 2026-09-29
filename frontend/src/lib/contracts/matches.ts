import type { OpportunityPath } from '@/lib/contracts/opportunities';
import type { EffectiveTier } from '@/lib/contracts/account';

// Mirrors backend/Services/MatchingService.cs's MatchResult/MatchFactor —
// the real signup payoff: full match details (not just counts, unlike
// opportunity-counts.ts), for the logged-in user's own profile only.
export interface MatchFactor {
  label: string;
  positive: boolean;
}

export interface MatchResult {
  opportunityId: string;
  title: string;
  provider: string;
  location: string | null;
  path: OpportunityPath;
  fitLabel: string;
  factors: MatchFactor[];
  // Real Opportunity fields (added 2026-09-29) — already-verified data that
  // wasn't previously surfaced here. All nullable in real data (especially
  // on Bundesagentur-synced Ausbildung rows), so the UI must omit rather
  // than show an empty placeholder for whichever ones are missing.
  description: string | null;
  sourceUrl: string | null;
  monthlyCompensationEur: number | null;
  tuitionFeeEur: number | null;
  startDate: string | null; // yyyy-MM-dd
  applicationDeadline: string | null; // yyyy-MM-dd
}

// Mirrors backend/Endpoints/MatchingEndpoints.cs's StateCount — an
// aggregate count only, computed from the user's full match list
// regardless of tier (see that file's comment for why this is safe to send
// in full even pre-unlock).
export interface StateCount {
  state: string;
  count: number;
}

// Mirrors backend/Endpoints/MatchingEndpoints.cs's MatchesResponse — a
// Free-tier user gets one real match plus blurredCount, never real data for
// the rest (see that file's comment for why). Tier1+ gets the full list
// with blurredCount always 0.
export interface MatchesResponse {
  effectiveTier: EffectiveTier;
  matches: MatchResult[];
  blurredCount: number;
  stateBreakdown: StateCount[];
}
