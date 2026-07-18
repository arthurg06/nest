import Stripe from "stripe";

// Stripe is configured entirely through environment variables; the
// integration stays dormant (and every payment endpoint fails safely with
// 503) until real credentials are provided. No key material ever lives in
// the codebase.
//
// Required to activate payments:
//   STRIPE_SECRET_KEY        sk_live_… / sk_test_…  (server only)
//   STRIPE_PREMIUM_PRICE_ID  price_…  (recurring monthly price, €20.00)
//   STRIPE_WEBHOOK_SECRET    whsec_…  (webhook endpoint signing secret)
//   APP_BASE_URL             public URL used for success/cancel redirects

let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client) {
    client = new Stripe(key);
  }
  return client;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PREMIUM_PRICE_ID);
}

export function isWebhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export function premiumPriceId(): string | undefined {
  return process.env.STRIPE_PREMIUM_PRICE_ID;
}
