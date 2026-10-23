// Mirrors backend/Models/Tier3Case.cs's Tier3CaseStatus.
export type Tier3CaseStatus =
  | 'Requested'
  | 'ConsultationScheduled'
  | 'AgreementSigned'
  | 'ActiveSearch'
  | 'ApplicationSubmitted'
  | 'Secured'
  | 'Complete'
  | 'Refunded';

// Mirrors backend/Endpoints/Tier3Endpoints.cs's Tier3CaseResponse — the
// signed-in user's own view of their Tier 3 case. One per user (not per
// opportunity) — see the backend model's own comment for why.
export interface Tier3Case {
  id: string;
  status: Tier3CaseStatus;
  targetOpportunityTitle: string | null;
  targetOpportunityProvider: string | null;
  agreementSentAt: string | null;
  agreementText: string | null;
  upfrontAmountEur: number | null;
  signedAt: string | null;
  successFeeRequestedAt: string | null;
  successFeePaidAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

// Mirrors backend/Endpoints/Tier3AdminEndpoints.cs's AdminTier3CaseResponse.
export interface AdminTier3Case {
  id: string;
  userId: string;
  userEmail: string;
  status: Tier3CaseStatus;
  targetOpportunityId: string | null;
  targetOpportunityTitle: string | null;
  targetOpportunityProvider: string | null;
  adminNotes: string | null;
  agreementSentAt: string | null;
  upfrontAmountEur: number | null;
  signedAt: string | null;
  successFeeRequestedAt: string | null;
  successFeePaidAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}
