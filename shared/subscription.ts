// Single source of truth for NEST Premium pricing, shared by the frontend,
// the Express API, and the Stripe integration. Money is stored in integer
// minor units (euro cents) — never floats.

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

/** "€20/month" — the user-facing price label. */
export const PREMIUM_PRICE_LABEL = `${formatPrice()}/${PREMIUM_PLAN.interval}`;

/** Sentence used wherever the renewal behavior must be explicit. */
export const PREMIUM_RENEWAL_NOTE = `Renews automatically every ${PREMIUM_PLAN.interval} at ${formatPrice()}. Cancel anytime.`;
