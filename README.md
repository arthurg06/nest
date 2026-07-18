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
| `DATABASE_URL` | production | Serverless Postgres (Neon). When set, all data persists across deploys and cold starts; without it, the JSON-file store is used |
| `BLOB_READ_WRITE_TOKEN` | production | Vercel Blob for uploaded images (persistent, CDN-served); without it, images go to `UPLOAD_DIR` |
| `DB_SEED` | optional | Base64 bootstrap applied once when the store is empty (see `scripts/make-db-seed.mjs`) |
| `PORT` | no | Local server port (default 3000) |
| `STRIPE_SECRET_KEY` | for payments | Stripe secret key (server only) |
| `STRIPE_PREMIUM_PRICE_ID` | for payments | Recurring €20/month Price ID |
| `STRIPE_WEBHOOK_SECRET` | for payments | Webhook signing secret |
| `APP_BASE_URL` | for payments | Public URL for checkout redirects |
| `VITE_API_BASE_URL` | packaged builds | API origin for the future iOS shell |
| `DB_PATH`, `UPLOAD_DIR` | no | Storage path overrides |

**Admin bootstrap:** put your email in `ADMIN_EMAILS`, then sign up (or log in) — the account becomes an admin and the Admin tab appears. Authorization is enforced server-side on every admin endpoint.

## Product flows

- **Discovery visibility** (changed 2026-07-19): every **active** member appears in discovery and can match, whether or not her verification is approved. Verification governs the Verified Student badge, not visibility; suspended accounts are excluded from both. To require approval again, restore the `verificationStatus === "approved"` filter in `/api/profiles` and the matching guard in `/api/swipe`.
- **Verification** (manual, admin-reviewed): members submit university + university email → status `pending` → an admin approves or rejects with a reason from the Admin tab. Details: [docs/ADMIN_AND_VERIFICATION.md](docs/ADMIN_AND_VERIFICATION.md)
- **Profiles**: up to 4 photos per member (`photos[]`, primary first; the legacy `photo` field always mirrors `photos[0]` so older records and clients keep working). Interests include a single-choice **animals** preference (dog lover / cat lover / loves all animals / plants over pets), which feeds compatibility. Sign-up and profile updates both run the same server-side sanitizer: unknown animal values are dropped, photos are capped at 4 and must be app-issued or https URLs.
- **Outings**: inside a chat, either member proposes what / where / when; places come from `shared/places.ts` (real Madrid venues by neighbourhood, campus options derived from each member's university, plus City Guide spots) ranked by university area, optional device proximity (browser-only, never stored), and shared interests. The other member accepts or declines; both are notified.
- **NEST Premium — €20/month**, renews monthly, cancel anytime via the Stripe Customer Portal. RSVP access to official outings is gated server-side by subscription entitlement. Pricing is centralized in `shared/subscription.ts` (integer euro cents). Setup: [docs/STRIPE.md](docs/STRIPE.md) (includes webhook, portal, and Apple Pay domain-verification steps)
- **Events**: created and deleted by administrators only (enforced in the API); everyone may browse.
- **Security decisions** (password hashing, sessions, rate limits, upload hardening, residual risks): [docs/SECURITY.md](docs/SECURITY.md)
- **iOS strategy** (PWA now, Capacitor later, Apple requirements): [docs/IOS.md](docs/IOS.md)

## Deployment

**Vercel** (configured via `vercel.json`): static frontend from `dist/`, `/api/*` + `/uploads/*` through a serverless Express function (region `iad1`, co-located with the Neon database in `us-east-1`; if the database is ever recreated in an EU region, move `regions` back to `fra1` in the same change), SPA fallback for direct URLs.

**Storage** is selected by environment (`server/storage/`):

- `DATABASE_URL` set → **serverless Postgres (Neon over HTTP)**. Whole-database snapshots are read per request and persisted as row-level diffs (one JSONB row per record, insertion order preserved), so concurrent instances only contend on rows they actually changed. Data survives redeploys and cold starts. An empty store is hydrated **once** from `DB_SEED` — reseeding a live database is impossible by construction.
- `DATABASE_URL` unset → the historical JSON file (local development, tests, self-hosted). On Vercel without a database this falls back to `/tmp` and **resets between cold starts** (demo behavior).
- `BLOB_READ_WRITE_TOKEN` set → uploads go to **Vercel Blob** (persistent, CDN-served, absolute URLs); unset → local `UPLOAD_DIR`.

> Request bodies on Vercel are capped (~4.5 MB), so photo uploads near the 8 MB app limit can fail there; a direct client→Blob upload flow is the future fix.

**Self-hosted** (full persistence on disk): `npm run build && npm start` on any Node 20+ host.

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
├── server/                    # db schema+migrations, storage backends
│                              #   (Postgres/file + diff engine), images
│                              #   (Blob/local), security, rate limit, stripe
├── api/index.ts               # Vercel serverless entrypoint
├── scripts/                   # Admin utilities (photo assignment, DB seed)
├── tests/                     # Vitest + Supertest suites
└── docs/                      # STRIPE, SECURITY, ADMIN_AND_VERIFICATION,
                               #   IOS, UX_AUDIT, PRODUCT_RESEARCH/ROADMAP
```

## Remaining production blockers

1. ~~Hosted database~~ **Done (2026-07-18):** Neon Postgres (`nest-db`, free plan, `us-east-1`) + Vercel Blob are live in production; persistence of accounts, matches, and messages across fresh deployments is verified end-to-end (`scripts/verify-prod-db.mjs` is the read-only check).
2. **Stripe activation** requires account credentials and dashboard setup (docs/STRIPE.md). Until then Premium is visibly "being configured" and collects nothing.
3. **Safety features** — reporting, blocking, community standards, privacy controls — are not yet implemented and are required before real users meet through the app (also an App Store requirement). See docs/PRODUCT_ROADMAP.md (B1).
4. **Email verification / password reset** flows do not exist yet.
5. Communities and the chat outing-planner remain UI shells (no backend), unchanged from the prototype.

## Deployment checklist (production)

- [x] Neon Postgres provisioned and `DATABASE_URL` present in all environments (2026-07-18)
- [ ] `ADMIN_EMAILS` set; first admin account created and verified
- [ ] Stripe live keys + webhook + Customer Portal + Apple Pay domain (docs/STRIPE.md)
- [ ] `APP_BASE_URL` set to the production domain
- [ ] Deployment Protection on previews; privacy policy page; reporting/blocking shipped
- [ ] Rate limiting moved to a shared store
- [ ] `npm test`, `npm run lint`, `npm run build` green
