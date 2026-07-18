# Stripe — NEST Premium (€20/month)

The integration is fully implemented behind environment variables and stays
**dormant until credentials are provided**. While unconfigured, every payment
endpoint returns `503`, the UI shows an honest "payments are being
configured" state, and nothing collects payment details. There is no card
form in this codebase — checkout happens on Stripe-hosted pages only.

Plan definition lives in `shared/subscription.ts` (2000 euro cents / month).
Change the price there **and** in the Stripe Price object together.

## Activation steps (require the Stripe account owner)

1. Create a Stripe account (or use the existing one) and complete business
   verification for live payments.
2. Dashboard → Product catalogue → create product **NEST Premium** with a
   recurring monthly price of **€20.00** → copy the `price_…` ID.
3. Developers → API keys → copy the secret key (`sk_test_…` first).
4. Developers → Webhooks → Add endpoint:
   - URL: `https://<your-domain>/api/stripe/webhook`
   - Events: `checkout.session.completed`,
     `customer.subscription.created`, `customer.subscription.updated`,
     `customer.subscription.deleted`, `invoice.paid`,
     `invoice.payment_failed`
   - Copy the signing secret (`whsec_…`).
5. Settings → Billing → Customer portal → activate the portal (used by the
   "Manage subscription" button).
6. Set the environment variables (locally in `.env`, on Vercel in Project
   Settings):
   ```
   STRIPE_SECRET_KEY=sk_…
   STRIPE_PREMIUM_PRICE_ID=price_…
   STRIPE_WEBHOOK_SECRET=whsec_…
   APP_BASE_URL=https://<your-domain>
   ```
7. Test in test mode with Stripe's test cards, confirm the webhook delivers,
   then swap to live keys.

No publishable key is needed: Stripe Checkout is a full redirect, so
`VITE_STRIPE_PUBLISHABLE_KEY` is unnecessary unless the integration later
moves to embedded Elements.

## Apple Pay

Apple Pay appears automatically in Stripe Checkout when: the Stripe account
has Apple Pay enabled, the customer uses Safari/iOS with a card in Wallet,
and the domain is registered (Settings → Payment methods → Apple Pay →
Add domain, which serves a verification file). No code changes required.
Availability always depends on Stripe's account/country/card-network
support — do not promise every card works.

## Architecture notes

- The webhook verifies signatures against the raw body and is registered
  before the JSON body parser.
- Event processing is idempotent (processed event IDs are stored).
- Users are resolved from the stored `stripeCustomerId` or the checkout
  session's `client_reference_id` — never from client-supplied IDs.
- Entitlement (`active`/`trialing` status, or an unexpired paid period) is
  computed server-side and gates RSVPs; the client's flags are display-only.
- Account deletion attempts to cancel any active subscription first.

## Current limitation (honest status)

Subscription state is persisted in the JSON-file database. That is fine for
development, but **live billing must not launch until the hosted-database
migration is done**: on Vercel the file lives in `/tmp` and resets between
cold starts, which would forget customer/subscription links (Stripe would
still have the truth, but the app would lose it until re-sync). Treat the
integration as production-ready code on a non-production datastore.
