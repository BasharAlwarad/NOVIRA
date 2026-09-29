import type { ProfileSnapshot, VerifiedProfile } from '@/lib/contracts/leads';

// Mirrors backend/Endpoints/AccountEndpoints.cs's AccountResponse — a
// signed-in user's own view of their own data (same profile fields as
// AdminUserDetail, minus the admin-only fraud-review fields).
export type EffectiveTier = 'Free' | 'Tier1' | 'Tier2' | 'Tier3';

export interface Account extends ProfileSnapshot, VerifiedProfile {
  id: string;
  email: string;
  fullName: string | null;
  createdAt: string;
  profileUpdatedAt: string | null;
  effectiveTier: EffectiveTier;
}
