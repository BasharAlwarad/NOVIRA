// Mirrors backend/Endpoints/MatchActivityEndpoints.cs's MatchActivityResponse
// — a user's own "I applied to this" marker for a specific match. One row
// per (user, opportunity) they've marked, created only when they mark it;
// un-marking deletes it rather than flipping a boolean, so absence from this
// list just means "not marked," not "marked false."
export interface MatchActivity {
  opportunityId: string;
  appliedAt: string;
}
