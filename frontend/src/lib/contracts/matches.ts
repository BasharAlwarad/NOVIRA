import type { OpportunityPath } from '@/lib/contracts/opportunities';

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
}
