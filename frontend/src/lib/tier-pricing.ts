// Config for the Tier 1/2 purchases — see Monetization-Strategy.md §4.1.
// Same "founder pastes the real Stripe Payment Link into .env.local,
// feature silently disabled if unset" pattern as application-help.ts's
// PAYMENT_LINK_BASE. Each Payment Link's own "after payment" redirect is
// configured (in the Stripe dashboard) to send the user back to
// /account?checkout_session={CHECKOUT_SESSION_ID} — see
// backend/Endpoints/PurchasesEndpoints.cs for what happens with that id.
const TIER1_PAYMENT_LINK = process.env.NEXT_PUBLIC_TIER1_PAYMENT_LINK ?? '';
const TIER2_PAYMENT_LINK = process.env.NEXT_PUBLIC_TIER2_PAYMENT_LINK ?? '';

// Single source of truth for the *displayed* prices only — kept in sync by
// hand with backend/Services/TierPricing.cs (the numbers that actually gate
// verification) and each Stripe Payment Link's own configured price. A
// mismatch here is a copy bug, not a billing bug, but still worth keeping
// honest. See TierPricing.cs for why this isn't shared code across the
// frontend/backend boundary.
export const TIER1_PRICE_EUR = 30;
export const TIER2_PRICE_EUR = 150;

// Tier 3 has no payment link — it isn't self-checkout (Monetization-
// Strategy.md §4.1 item 4: a real conversation happens before any payment),
// so there's no isTier3PurchaseEnabled()/getTier3PaymentLink() pair here.
// These are display-only figures for /#services and the request flow's own
// copy. €500 upfront + €1,000 once an opportunity is secured.
export const TIER3_PRICE_EUR = 1500;
export const TIER3_UPFRONT_EUR = 500;

export function isTier1PurchaseEnabled(): boolean {
  return TIER1_PAYMENT_LINK.length > 0;
}

export function getTier1PaymentLink(): string {
  return TIER1_PAYMENT_LINK;
}

export function isTier2PurchaseEnabled(): boolean {
  return TIER2_PAYMENT_LINK.length > 0;
}

export function getTier2PaymentLink(): string {
  return TIER2_PAYMENT_LINK;
}
