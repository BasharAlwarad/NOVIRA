// The free account-signup boundary (Plan.md §4) — email-only magic-link
// auth, no password. The raw session token never appears in these
// client-visible shapes; it lives only in the HttpOnly cookie the Next.js
// Route Handler sets, never in a JSON response body a client script could
// read (see frontend/src/app/api/auth/verify/route.ts).

import type { ProfileSnapshot } from '@/lib/contracts/leads';

// profile is optional (verifying an email doesn't require a completed
// assessment) but SignupPrompt always sends it when available, same as
// SaveResultPrompt/OpportunityCounts — otherwise a user who signs up
// without ever using SaveResultPrompt first lands on a Users row with an
// empty profile, and /matches' hard filters correctly find nothing.
export interface RequestLinkRequest {
  email: string;
  profile?: ProfileSnapshot | null;
}

export interface RequestLinkResponse {
  emailSent: boolean;
}

export interface VerifyRequest {
  token: string;
}

export interface VerifyResponse {
  email: string;
}

export interface MeResponse {
  email: string;
}
