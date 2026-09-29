import type { EffectiveTier } from '@/lib/contracts/account';

// Mirrors backend/Endpoints/PurchasesEndpoints.cs's VerifySessionRequest/
// VerifySessionResponse.
export type PurchaseTier = 'Tier1' | 'Tier2' | 'Tier3';

export interface VerifySessionRequest {
  tier: PurchaseTier;
  sessionId: string;
}

export interface VerifySessionResponse {
  effectiveTier: EffectiveTier;
  alreadyProcessed: boolean;
}
