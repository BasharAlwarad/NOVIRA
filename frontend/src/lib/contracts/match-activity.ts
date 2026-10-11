import type { OpportunityPath } from '@/lib/contracts/opportunities';

// Mirrors backend/Endpoints/MatchActivityEndpoints.cs's MatchActivityResponse
// — a user's own "I applied to this" marker for a specific match. One row
// per (user, opportunity) they've marked, created only when they mark it;
// un-marking deletes it rather than flipping a boolean, so absence from this
// list just means "not marked," not "marked false."
//
// opportunityTitle/opportunityProvider/opportunityPath are a snapshot taken
// at mark-applied time, not a live join — added 2026-10-11 alongside
// opportunity archiving, since an archived opportunity drops out of
// /matches' Approved-only result entirely, so this history needs its own
// display data to keep showing up on /matches. isArchived is the one
// non-snapshotted field — it's a live check against the opportunity's
// current status, since archiving can happen well after the user applied.
export interface MatchActivity {
  opportunityId: string;
  appliedAt: string;
  opportunityTitle: string;
  opportunityProvider: string;
  opportunityPath: OpportunityPath;
  isArchived: boolean;
}
