# NEST — Madrid Student Net

NEST is a women-only social discovery and friendship platform for international students in Madrid. Members create a profile, get verified by the NEST team, discover compatible women through a swipe deck, match, chat, share city spots, and join curated outings.

> **Status: pre-launch.** Core flows are real and tested (auth, verification review, matching, chat, admin, moderation). Payments are implemented but dormant until Stripe credentials are added, and the JSON-file database is a development datastore — see [Remaining production blockers](#remaining-production-blockers).

## Technology stack

React 19 + TypeScript + Vite 6 · Tailwind CSS 4 (brand theme in `src/index.css`) · Motion · Lucide · Express 4 (`tsx` in dev) · JSON-file database (`db.json`, interim) · Stripe (Checkout + Customer Portal + webhooks, env-gated) · Vitest + Supertest (57 tests).

## Local development

Prerequisites: Node.js ≥ 20 and npm.

```bash
git clone <repository-url> nest && cd nest
npm install
cp .env.example .env        # fill in values (see below)
npm run dev                 # http://localhost:3000
```

```bash
npm run lint    # TypeScript typecheck
npm test        # vitest run (57 tests)
npm run build   # frontend → dist/, server bundle → dist/server.cjs
npm start       # production server (self-hosted)
```

The server auto-creates an empty `db.json` on first run and migrates older records automatically (verification statuses, roles, legacy country names, legacy plain-text passwords re-hash on first login).

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ADMIN_EMAILS` | recommended | Bootstrap: emails granted `role: "admin"` at sign-up/login |
| `PORT` | no | Local server port (default 3000) |
| `STRIPE_SECRET_KEY` | for payments | Stripe secret key (server only) |
| `STRIPE_PREMIUM_PRICE_ID` | for payments | Recurring €20/month Price ID |
| `STRIPE_WEBHOOK_SECRET` | for payments | Webhook signing secret |
| `APP_BASE_URL` | for payments | Public URL for checkout redirects |
| `VITE_API_BASE_URL` | packaged builds | API origin for the future iOS shell |
| `DB_PATH`, `UPLOAD_DIR` | no | Storage path overrides |

**Admin bootstrap:** put your email in `ADMIN_EMAILS`, then sign up (or log in) — the account becomes an admin and the Admin tab appears. Authorization is enforced server-side on every admin endpoint.

## Product flows

- **Verification** (manual, admin-reviewed): members submit university + university email → status `pending` → an admin approves or rejects with a reason from the Admin tab. Only `approved`, active members appear in discovery or can match. Details: [docs/ADMIN_AND_VERIFICATION.md](docs/ADMIN_AND_VERIFICATION.md)
- **NEST Premium — €20/month**, renews monthly, cancel anytime via the Stripe Customer Portal. RSVP access to official outings is gated server-side by subscription entitlement. Pricing is centralized in `shared/subscription.ts` (integer euro cents). Setup: [docs/STRIPE.md](docs/STRIPE.md) (includes webhook, portal, and Apple Pay domain-verification steps)
- **Events**: created and deleted by administrators only (enforced in the API); everyone may browse.
- **Security decisions** (password hashing, sessions, rate limits, upload hardening, residual risks): [docs/SECURITY.md](docs/SECURITY.md)
- **iOS strategy** (PWA now, Capacitor later, Apple requirements): [docs/IOS.md](docs/IOS.md)

## Deployment

**Vercel** (configured via `vercel.json`): static frontend from `dist/`, `/api/*` + `/uploads/*` through a serverless Express function, SPA fallback for direct URLs. Import the repo in Vercel, set the environment variables, deploy.

> ⚠️ **Vercel previews are demo environments.** The serverless filesystem is read-only, so the database and uploads live in `/tmp` and **reset between cold starts** — accounts, matches, photos, and Stripe linkage periodically disappear. Request bodies are capped (~4.5 MB), so large photo uploads fail there. Enable Deployment Protection to keep previews private. Real persistence requires the hosted-database migration below.

**Self-hosted** (full persistence): `npm run build && npm start` on any Node 20+ host with a writable disk.

## Project structure

```
├── index.html / public/       # SPA shell, PWA manifest, brand icons
├── logo/NEST_OFFICIAL_LOGO.png  # Brand master (2000×2000)
├── src/                       # React app (components, lib, theme)
├── shared/                    # Code shared client+server: subscription
│                              #   plan, countries dataset, compatibility
├── server.ts                  # Express API (auth, verification, matching,
│                              #   chat, events, admin, Stripe)
├── server/                    # db schema+migrations, security, rate limit,
│                              #   stripe client
├── api/index.ts               # Vercel serverless entrypoint
├── scripts/                   # Admin utilities (profile photo assignment)
├── tests/                     # Vitest + Supertest suites (57 tests)
└── docs/                      # STRIPE, SECURITY, ADMIN_AND_VERIFICATION, IOS
```

## Remaining production blockers

1. **Hosted database + object storage.** `db.json` and local `uploads/` do not scale, have no concurrent-write safety, and are ephemeral on Vercel. Migrate to Postgres (Neon/Supabase) + blob storage before launch; live Stripe billing must wait for this.
2. **Stripe activation** requires account credentials and dashboard setup (docs/STRIPE.md). Until then Premium is visibly "being configured" and collects nothing.
3. **Safety features** — reporting, blocking, community standards, privacy controls — are not yet implemented and are required before real users meet through the app (also an App Store requirement).
4. **Email verification / password reset** flows do not exist yet.
5. Communities and the chat outing-planner remain UI shells (no backend), unchanged from the prototype.

## Deployment checklist (production)

- [ ] Hosted Postgres + blob storage migration
- [ ] `ADMIN_EMAILS` set; first admin account created and verified
- [ ] Stripe live keys + webhook + Customer Portal + Apple Pay domain (docs/STRIPE.md)
- [ ] `APP_BASE_URL` set to the production domain
- [ ] Deployment Protection on previews; privacy policy page; reporting/blocking shipped
- [ ] Rate limiting moved to a shared store
- [ ] `npm test`, `npm run lint`, `npm run build` green
