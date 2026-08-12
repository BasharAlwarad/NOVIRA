import type { ProfileSnapshot } from '@/lib/contracts/leads';

export type OpportunityCountsRequest = ProfileSnapshot;

export interface OpportunityCountsResponse {
  ausbildungCount: number;
  universityCount: number;
}
