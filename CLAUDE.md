# NEST — project guide for Claude Code

NEST is a women-only friendship app for international students in Madrid. Its
product owner is Diana. This file is read automatically at the start of every
Claude Code session in this folder — read it fully before making changes.

> **Everything in this project is written in English** — code, comments, UI
> copy, commit messages, docs, tests. Keep it that way, even if the person you
> are helping writes to you in another language. (Reply to them in their
> language; write the project's files in English.)

---

## What you're working with

- **Frontend:** Vite 6 + React 19 + TypeScript, Tailwind CSS 4 (config lives in
  CSS via `@theme`, and Tailwind scans the repo root including `shared/`),
  Motion for animation, Lucide for icons.
- **Backend:** one Express 4 server, `server.ts`, started with `tsx server.ts`.
  It does **not** hot-reload — restart it after a server-side edit. (The Vite
  frontend *does* hot-reload.)
- **Storage:** `server/storage/`. Uses **Neon Postgres** when `DATABASE_URL`
  (or `POSTGRES_URL`) is set, otherwise a local **JSON file** (`db.json`). One
  JSONB row per record in the `nest_records` table.
- **Images:** Vercel Blob.
- **Shared logic:** `shared/` holds rules used by *both* server and client — e.g.
  `shared/visibility.ts` (which profile fields are visible to whom) and
  `shared/avatar.ts`. When a rule is shared, change it there, not in two places.

## Running, testing, shipping

- `npm run dev` — run the app locally at **http://localhost:3000** (your private
  preview; nobody else sees it).
- `npm test` — the vitest suite (100+ tests). Run it before you ship.
- `npm run lint` — TypeScript check (`tsc --noEmit`).
- `npm run build` — production build; run it to catch errors the deploy would hit.

**Deployment is automatic.** Push to the `main` branch and Vercel builds and
deploys to **https://nest-indol.vercel.app** on its own — there is no manual
deploy step. The loop is: edit → `npm run dev` to check → `npm test` → commit →
`git push` → it goes live.

Without secrets (`.env.local`), the app runs against a local test database — a
safe sandbox. It only touches the real member data once the real environment
variables are present.

## Rules that must not be broken

Product and safety invariants. Do **not** change these on your own initiative —
only when Diana explicitly asks for the change.

- **Never** print, log, reset, or expose passwords, secrets, or real member data
  — not in code, tests, logs, commits, docs, or screenshots. Tests use synthetic
  data and `example.com` emails only.
- Keep the security model intact: password hashing (scrypt), secure session
  tokens, manual admin verification of students, server-side authorization on
  every admin and event action, and the existing account-deletion behavior.
- The **Verified Student** badge shows only for admin-approved users.
- Premium is **€20 / month**. The Stripe integration is built but dormant (live
  keys not set yet). Don't change pricing or the payment model on your own.
- No fake content: no canned chat messages, no fake matches, no raw credit-card
  form (payments go through Stripe when it's enabled).
- "Sign out" and "delete account" are separate actions — never merge them.
- The country list is intentional and complete (Palestine included) — don't trim it.

## Features that need an explicit go-ahead first

Big scope, privacy, or App-Store implications — confirm with Diana before
building any of these; don't add them speculatively: communities backend, group
chat, live location sharing, public user-created events, push notifications,
calendar sync, Spotify, contacts access, changes to payments/Premium, a native
app, AI-generated messages, facial recognition.

## Gotchas worth knowing

- **Vercel / ESM:** every server-side *relative* import needs an explicit `.js`
  extension, or the production build breaks (even though local dev tolerates it).
- **scrypt** is CPU-heavy; the test suite can occasionally flake under heavy
  parallel load. Re-run once before assuming a real failure.
- A domain move to **nestspain.com** is planned for later — don't hardcode the
  current URL in ways that would make that migration painful.

## Deeper references

The `docs/` folder: `DEV_SETUP.md` (first-time setup), `SECURITY.md`,
`ADMIN_AND_VERIFICATION.md`, `STRIPE.md`, `PRODUCT_ROADMAP.md`,
`PRODUCT_RESEARCH.md`, `UX_AUDIT.md`, `IOS.md`.
