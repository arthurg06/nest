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

// ---------------------------------------------------------------------------
// Membership options. Display-only until payments are connected: when Stripe
// arrives, each plan maps to one Price via `stripePriceEnv` (the env var that
// will hold its Price ID), and a successful checkout activates Premium with
// the plan's duration driving expiry/renewal. None of that logic exists yet
// — deliberately.
// ---------------------------------------------------------------------------

export interface PremiumPlanOption {
  id: "monthly" | "quarterly" | "yearly";
  /** Shown on the plan card, e.g. "€20 / month". */
  label: string;
  priceCents: number;
  /** Months of access one payment buys — future expiry/renewal math. */
  months: number;
  /** The single highlighted option. Exactly one plan carries this. */
  bestValue?: boolean;
  /** Env var that will hold this plan's Stripe Price ID when payments land. */
  stripePriceEnv: string;
}

export const PREMIUM_PLAN_OPTIONS: PremiumPlanOption[] = [
  { id: "monthly", label: "€20 / month", priceCents: 2000, months: 1, stripePriceEnv: "STRIPE_PREMIUM_PRICE_ID" },
  { id: "quarterly", label: "€50 / 3 months", priceCents: 5000, months: 3, stripePriceEnv: "STRIPE_PREMIUM_QUARTERLY_PRICE_ID" },
  { id: "yearly", label: "€200 / year", priceCents: 20000, months: 12, bestValue: true, stripePriceEnv: "STRIPE_PREMIUM_YEARLY_PRICE_ID" },
];

/**
 * Guest Pass policy. Not enforced yet — the numbers live here (shared by
 * client copy and the future server-side check) so enforcement can be added
 * without touching the UI.
 */
export const GUEST_PASS_POLICY = {
  guestsPerOuting: 1,
  usesPerMonth: 3,
} as const;

// ---------------------------------------------------------------------------
// Partner perks. Structure only: perks are added/edited/deactivated by
// changing this list (or a future admin surface writing the same shape) —
// the Premium page renders whatever is active without redesign.
// ---------------------------------------------------------------------------

export interface PartnerPerk {
  id: string;
  partner: string;
  /** One line, e.g. "10% off brunch on weekdays". */
  offer: string;
  emoji?: string;
  active: boolean;
}

export const PARTNER_PERKS: PartnerPerk[] = [
  // No live partners yet — the first entries land here.
];

export const activePartnerPerks = () => PARTNER_PERKS.filter(p => p.active);
