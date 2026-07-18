# NEST — Madrid Student Net

NEST is a women-only social discovery and friendship platform for international university students moving to Madrid. Members create a profile with their interests, languages, and lifestyle, discover other verified students through a swipe deck, match based on compatibility, chat, share city recommendations ("secret spots"), and join curated events.

> **Status: prototype.** The codebase originated as a Google AI Studio prototype and is being productionized. Several flows are simulated (see [Current limitations](#current-limitations)) — do not open the app to real users yet.

## Main features

- **Multi-step onboarding** — account creation with profile photo upload, nationalities, languages with fluency levels, interests, and social handles
- **Swipe-based discovery** — browse verified profiles, like or pass, with a compatibility score computed from shared activities, music, social plans, lifestyle, spending style, languages, and university
- **Matching & chat** — mutual likes create a match with a compatibility report and a direct-message thread
- **Outing planner** — propose meetups at curated Madrid venues from an illustrated city map (UI present, persistence not yet implemented)
- **City Discovery** — student-curated recommendations with categories, tags, photos, likes, and Google Maps links
- **Official events** — admin-published outings with RSVP and capacity limits, gated behind a Premium subscription (payment is currently simulated)
- **Admin dashboard** — user management and content moderation for accounts listed in `ADMIN_EMAILS`
- **Account self-service** — profile editing and full account deletion with data cleanup

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 6 |
| Styling | Tailwind CSS 4, Motion (animations), Lucide (icons) |
| Backend | Express 4 (TypeScript, run with tsx in dev) |
| Persistence | JSON file database (`db.json`) — interim solution, migration to a hosted database planned |
| Uploads | Local filesystem (`uploads/`), base64 JSON transport |
| Deployment | Vercel (static frontend + serverless Express function), or any Node host |

## Local installation

Prerequisites: Node.js ≥ 20 and npm.

```bash
git clone <repository-url> nest
cd nest
npm install
cp .env.example .env   # then edit values (see below)
npm run dev            # http://localhost:3000
```

The server auto-creates an empty `db.json` on first run. To get an admin account, put your email in `ADMIN_EMAILS` in `.env` before signing up.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ADMIN_EMAILS` | recommended | Comma-separated emails granted the admin role at sign-up/login |
| `PORT` | no | Local server port (default `3000`) |
| `DB_PATH` | no | Override for the JSON database location |
| `UPLOAD_DIR` | no | Override for the uploaded-images directory |

No secrets are committed to the repository. `db.json` and `uploads/` contain user data and are gitignored.

## Development commands

```bash
npm run dev     # Express + Vite dev middleware with HMR on :3000
npm run lint    # TypeScript typecheck (tsc --noEmit)
```

## Production build (self-hosted)

```bash
npm run build   # builds frontend to dist/ and bundles server to dist/server.cjs
npm start       # NODE_ENV=production node dist/server.cjs
```

## Deployment (Vercel)

The repository is pre-configured for Vercel via `vercel.json`:

- The frontend is built with `npm run build:client` and served from `dist/` by the CDN.
- `/api/*` and `/uploads/*` are rewritten to a serverless function (`api/index.ts`) that wraps the Express app.
- All other routes fall back to `index.html`, so direct URLs work.

Setup: push this repository to GitHub, then in Vercel choose **Add New Project → Import** the repo. No framework preset is needed (`vercel.json` drives the build). Set `ADMIN_EMAILS` in **Project Settings → Environment Variables**. Every branch/PR then gets a preview URL; `main` deploys to production.

> ⚠️ **Ephemeral data on Vercel:** the serverless filesystem is read-only, so the database and uploads live in `/tmp` and reset between cold starts. Vercel deployments are therefore **demo/preview environments only** — accounts, matches, and photos will periodically disappear. Real persistence requires migrating to a hosted database and blob storage (see next steps). Also note that Vercel caps serverless request bodies at ~4.5 MB, so photo uploads larger than ~3 MB (base64 overhead included) will fail there even though the app's own limit is 8 MB. It is recommended to enable **Deployment Protection** in Vercel so previews are not publicly accessible.

## Project structure

```
├── index.html              # SPA entry
├── public/                 # Static assets (logo/favicon)
├── src/
│   ├── main.tsx            # React bootstrap
│   ├── App.tsx             # Root component: auth gate, tabs, data loading
│   ├── types.ts            # Shared frontend types
│   ├── data.ts             # Interest options, compatibility scoring, Madrid map spots
│   ├── index.css           # Tailwind theme + global styles
│   └── components/         # Screens & UI (onboarding, swipe, chat, events, admin…)
├── server.ts               # Express API + static serving / Vite middleware
├── server/db.ts            # JSON file database schema and read/write helpers
├── api/index.ts            # Vercel serverless entrypoint (wraps the Express app)
├── vercel.json             # Vercel build & routing configuration
└── .env.example            # Documented environment variables
```

## Current limitations

Known gaps that must be resolved before real users touch the app:

1. **Passwords are stored in plain text** in `db.json`. Hashing (bcrypt/scrypt) is the top priority fix.
2. **The Premium payment flow is simulated.** The modal collects card details in the browser, waits 1.5 s, and reports a successful €10 charge — no payment processor is connected and card data goes nowhere. This must be replaced with Stripe (or removed) before launch.
3. **Student verification is simulated.** Both "verify" buttons mark the profile verified without any real check.
4. **Chat auto-replies impersonate the other user.** Sending a message calls a non-existent `/api/chat/respond` endpoint and, on failure, posts a canned "reply" into the conversation. This is a leftover from the AI-persona prototype and must be removed — in a real two-sided chat the other person answers herself.
5. **Chat message alignment is broken** — the UI checks `senderId === "me"` but the server stores real user IDs, so messages don't align by sender.
6. **The outing planner and Communities tabs are UI shells** — no backend endpoints or persistence exist for plans or community chats.
7. **Session tokens use `Math.random()`** — not cryptographically secure; no rate limiting on auth endpoints.
8. **`/api/upload` does not require authentication** (the signup flow uploads the photo before an account exists). Needs abuse protection.
9. **JSON file persistence** does not scale and is ephemeral on Vercel.
10. **No safety features yet** — reporting, blocking, and privacy controls from the product principles are not implemented.
11. **Single 550 kB JS bundle** — no code splitting yet; the logo PNG is 287 kB.

## Recommended next steps

1. Hash passwords and issue secure session tokens (crypto-random, httpOnly cookie or signed token).
2. Remove the fake AI auto-reply and fix message alignment so chat is a genuine two-sided conversation.
3. Replace the simulated payment modal with Stripe Checkout (or hide Premium behind a feature flag until then).
4. Migrate persistence to a hosted database (e.g. Neon/Vercel Postgres, Turso, or Supabase) and uploads to blob storage (Vercel Blob or S3) so Vercel deployments are fully functional.
5. Implement real student verification, then reporting/blocking and privacy controls.
6. Build the plans/communities backends or remove the shells from navigation.
7. Performance & polish: code-split, compress the logo, then the visual redesign per the product brief.
