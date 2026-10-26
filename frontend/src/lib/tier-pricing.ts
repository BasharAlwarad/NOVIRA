import type { EffectiveTier } from '@/lib/contracts/account';

// Config for the Tier 1/2 purchases — see Monetization-Strategy.md §4.1.
// Same "founder pastes the real Stripe Payment Link into .env.local,
// feature silently disabled if unset" pattern as application-help.ts's
// PAYMENT_LINK_BASE. Each Payment Link's own "after payment" redirect is
// configured (in the Stripe dashboard) to send the user back to
// /account?checkout_session={CHECKOUT_SESSION_ID} — see
// backend/Endpoints/PurchasesEndpoints.cs for what happens with that id.
const TIER1_PAYMENT_LINK = process.env.NEXT_PUBLIC_TIER1_PAYMENT_LINK ?? '';
const TIER2_PAYMENT_LINK = process.env.NEXT_PUBLIC_TIER2_PAYMENT_LINK ?? '';

// Tier2's one carry-up scenario (round 6) — a user who already paid Tier1's
// €30 pays €120, not €150, mirroring Tier3's carry-up pattern below but
// simpler (only one credit source exists below Tier2, so one extra link is
// enough — see backend/Services/Tier2PricingCalculator.cs for the matching
// server-side amount, which is what actually gets verified). Empty until
// the founder creates this Payment Link in the Stripe dashboard and sets
// NEXT_PUBLIC_TIER2_PAYMENT_LINK_FROM_TIER1 — until then, every helper below
// gracefully falls back to the full-price link/amount, same "silently
// disabled if unset" discipline every other link here already follows.
const TIER2_PAYMENT_LINK_FROM_TIER1 = process.env.NEXT_PUBLIC_TIER2_PAYMENT_LINK_FROM_TIER1 ?? '';

// Single source of truth for the *displayed* prices only — kept in sync by
// hand with backend/Services/TierPricing.cs (the numbers that actually gate
// verification) and each Stripe Payment Link's own configured price. A
// mismatch here is a copy bug, not a billing bug, but still worth keeping
// honest. See TierPricing.cs for why this isn't shared code across the
// frontend/backend boundary.
export const TIER1_PRICE_EUR = 30;
export const TIER2_PRICE_EUR = 150;

// Display-only figures for /#services and the request/signing flow's own
// copy — shown as two separate figures, not one combined total, since
// they're genuinely two separate payments (upfront, then a success fee
// only if the application succeeds), not one flat charge.
export const TIER3_UPFRONT_EUR = 500;
export const TIER3_SUCCESS_FEE_EUR = 1000;

// Tier 3 still isn't self-checkout in the Tier1/2 sense — a Payment Link
// only ever appears after the founder has sent, and the user has signed,
// the real agreement (see tier3-request.tsx). Three static links, one per
// possible carry-up-adjusted amount (Monetization-Strategy.md §4.2a: €500
// from Free, €470 from Tier 1, €350 from Tier 2) — a fixed, small set of
// discrete prices, so this stays three manually-created Stripe Payment
// Links rather than a dynamically-generated Checkout Session (this
// project's Stripe integration is deliberately thin — see
// StripeCheckoutClient.cs). Each must be configured in the Stripe dashboard
// with the same success-redirect pattern Tier1/2 already use, with
// &tier=Tier3 appended.
const TIER3_PAYMENT_LINK_FROM_FREE = process.env.NEXT_PUBLIC_TIER3_PAYMENT_LINK_FROM_FREE ?? '';
const TIER3_PAYMENT_LINK_FROM_TIER1 = process.env.NEXT_PUBLIC_TIER3_PAYMENT_LINK_FROM_TIER1 ?? '';
const TIER3_PAYMENT_LINK_FROM_TIER2 = process.env.NEXT_PUBLIC_TIER3_PAYMENT_LINK_FROM_TIER2 ?? '';

export function getTier3PaymentLink(upfrontAmountEur: number): string {
  if (upfrontAmountEur <= 350) return TIER3_PAYMENT_LINK_FROM_TIER2;
  if (upfrontAmountEur <= 470) return TIER3_PAYMENT_LINK_FROM_TIER1;
  return TIER3_PAYMENT_LINK_FROM_FREE;
}

// The €1,000 success fee (build order step 5) — flat, no carry-up variant
// (unlike the upfront amount above), so just one static Payment Link.
// Success-redirect: /account?success_fee_session={CHECKOUT_SESSION_ID} — a
// deliberately distinct query param from checkout_session/&tier=, so it
// can't collide with the existing Tier1/2/Tier3-upfront redirect handler.
const TIER3_SUCCESS_FEE_PAYMENT_LINK = process.env.NEXT_PUBLIC_TIER3_SUCCESS_FEE_PAYMENT_LINK ?? '';

export function getTier3SuccessFeePaymentLink(): string {
  return TIER3_SUCCESS_FEE_PAYMENT_LINK;
}

export function isTier1PurchaseEnabled(): boolean {
  return TIER1_PAYMENT_LINK.length > 0;
}

export function getTier1PaymentLink(): string {
  return TIER1_PAYMENT_LINK;
}

export function isTier2PurchaseEnabled(): boolean {
  return TIER2_PAYMENT_LINK.length > 0;
}

function tier2HasCarryUpDiscount(effectiveTier: EffectiveTier): boolean {
  return effectiveTier === 'Tier1' && TIER2_PAYMENT_LINK_FROM_TIER1.length > 0;
}

export function getTier2PaymentLink(effectiveTier: EffectiveTier): string {
  return tier2HasCarryUpDiscount(effectiveTier) ? TIER2_PAYMENT_LINK_FROM_TIER1 : TIER2_PAYMENT_LINK;
}

export function getTier2PriceEur(effectiveTier: EffectiveTier): number {
  return tier2HasCarryUpDiscount(effectiveTier) ? TIER2_PRICE_EUR - TIER1_PRICE_EUR : TIER2_PRICE_EUR;
}
