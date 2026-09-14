// LEGACY — dormant subscription pricing. NEST no longer sells a
// subscription: the app is free and NEST Experiences are individually
// priced events. This file remains only because the dormant Stripe
// endpoints in server.ts still reference it; a future per-experience
// checkout will replace it with per-event pricing. Money is stored in
// integer minor units (euro cents) — never floats.

export const PREMIUM_PLAN = {
  name: "NEST Premium",
  priceCents: 2000, // €20.00
  currency: "EUR",
  interval: "month"
} as const;

export function formatPrice(cents: number = PREMIUM_PLAN.priceCents, currency: string = PREMIUM_PLAN.currency): string {
  const symbol = currency === "EUR" ? "€" : `${currency} `;
  const whole = cents % 100 === 0;
  return `${symbol}${(cents / 100).toFixed(whole ? 0 : 2)}`;
}

/** "€20/month" — kept for the dormant status endpoint's plan label. */
export const PREMIUM_PRICE_LABEL = `${formatPrice()}/${PREMIUM_PLAN.interval}`;
