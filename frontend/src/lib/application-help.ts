// Config for the paid "Get help applying" offer (built 2026-09-12) — see
// Monetization-Strategy.md §4/§4.4 for the full reasoning. Deliberately the
// smallest possible v1: a real Stripe Payment Link (created directly in the
// Stripe dashboard, no billing/webhook integration in this app at all)
// rather than a fake interest-capture button — a real payment is a
// stronger willingness-to-pay signal for the same amount of code. No
// backend involved yet; this is purely the "ship the offer" step. A real
// request/tracking model only gets built if this gets real clicks/payments
// (see Monetization-Strategy.md §4.4's build order).
//
// This is a distinct, narrower offer from the still-unbuilt Tier 2 (paid
// document verification, `Plan.md` §4/§5) — hands-on help with one specific
// matched opportunity, not document review in general. Don't conflate the
// two if Tier 2 gets built later.

// The founder creates the actual Payment Link in the Stripe dashboard and
// pastes its URL into frontend/.env.local as this variable. Needs the
// NEXT_PUBLIC_ prefix since it's read from a client component (the match
// cards on /matches) — Next.js inlines NEXT_PUBLIC_* values at build time.
// Empty/undefined until that's configured, and the CTA is deliberately not
// rendered at all in that case (same "silently skip an unconfigured
// optional feature" pattern as Resend's ApiKey elsewhere in this app)
// rather than showing a dead or broken button.
const PAYMENT_LINK_BASE = process.env.NEXT_PUBLIC_APPLICATION_HELP_PAYMENT_LINK ?? '';

// Single source of truth for the *displayed* price. Keep this in sync by
// hand with whatever price is actually configured on the Stripe Payment
// Link itself (a Payment Link carries its own price on Stripe's side —
// this constant only controls what the page says, so a mismatch here would
// be a copy bug, not a billing bug, but still worth keeping honest).
// Chosen from the €25–75 range researched in Monetization-Strategy.md
// §2.3/§4.2 — near the low end, since the near-term goal is covering AI +
// hosting cost, not turning a profit (§4).
export const APPLICATION_HELP_PRICE_EUR = 35;

export function isApplicationHelpEnabled(): boolean {
  return PAYMENT_LINK_BASE.length > 0;
}

// Appends Stripe's own `client_reference_id` query parameter so a completed
// payment can later be correlated back to which opportunity it was for —
// a documented, zero-integration Stripe Payment Link feature (no
// webhook/backend needed on this end to attach it; Stripe carries the value
// through to the resulting Checkout Session for later reference). This is
// deliberately best-effort: if Stripe ever changes this, the link still
// works for taking payment, it just loses the free correlation convenience.
export function buildApplicationHelpLink(opportunityId: string): string {
  const separator = PAYMENT_LINK_BASE.includes('?') ? '&' : '?';
  return `${PAYMENT_LINK_BASE}${separator}client_reference_id=${encodeURIComponent(opportunityId)}`;
}
