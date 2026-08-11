# NEST — handoff / current state

Read **`CLAUDE.md`** (repo root) first — it holds the permanent project rules and
architecture. This file is the *point-in-time* snapshot: what's live, what's in
progress, and what to pick up next. (For exact dates, see `git log`.)

## Where things stand

- NEST is **live in production**: https://nest-indol.vercel.app (Vercel, team
  `arthurteam`), backed by Neon Postgres + Vercel Blob. ~106 tests pass.
- `arthurg06/nest` is the source of truth. Push to **`main`** → Vercel
  auto-deploys. Local dev: `npm run dev` (falls back to a local test DB when
  there is no `.env.local`, so it runs with zero setup).

## In progress: handover to Diana (the product owner)

Arthur (the agency) is handing day-to-day development to **Diana** so she can
work from her own Mac via the **Claude desktop app** (Claude Code).

**Done**
- Diana added as a GitHub collaborator; she cloned the repo and ran it locally
  (`npm install` + `npm run dev` both succeed).
- `CLAUDE.md` (project brief her Claude Code reads automatically) and
  `docs/DEV_SETUP.md` (setup guide) were added and pushed.

**Blocker currently being resolved — account vs. local folder**
- Diana logged into *Arthur's* Claude account and the NEST project "didn't
  appear" in Claude Code. That's expected: Claude Code opens **local folders on
  the machine**, not projects "stored in an account." The account is only
  login + billing.
- **Fix:** she opens her **own local `nest` folder** (cloned into her home
  directory, e.g. `/Users/a/nest`) and uses **her own** Claude subscription —
  not Arthur's. Sharing his account also exposes his other clients, so it's the
  wrong path regardless.
- Her clone predates `CLAUDE.md`, so her first action must be a **`git pull`**.

## Pending (owner actions / decisions)

- [ ] **Diana:** open the local `nest` folder in Claude Code on her *own*
      account; first prompt → *"Pull the latest from GitHub, then read CLAUDE.md
      and docs/DEV_SETUP.md, set me up, run the app, and show me how to publish a
      change."*
- [ ] **Arthur:** send Diana `.env.local` via **Bitwarden Send** when she needs
      real data (never by email). Those values point at the **live** database —
      consider a separate dev database before any risky work.
- [ ] **Arthur:** delete the disconnected **ZIP deployment** uploaded to Diana's
      personal Vercel (no secrets → empty/ephemeral DB; not linked to GitHub → no
      auto-update). The real production stays nest-indol.vercel.app.
- [ ] Make the GitHub repo **private** (client code, and Diana is now a collaborator).
- [ ] Provide **Stripe** keys to activate Premium — currently dormant (see `docs/STRIPE.md`).

## Known product gaps (from earlier audits — see `docs/PRODUCT_ROADMAP.md`)

- **Report/block + moderation** (roadmap B1) — needed before opening to real
  members and required for the App Store.
- **Events RSVP is unusable:** RSVP requires Premium → Premium requires Stripe →
  Stripe is dormant. Proposed fix (not applied — business decision): only enforce
  the Premium gate when Stripe is configured.
- No **database backup** yet. No **"new message" notification** to bring members back.

## Resume prompt for the next session

> You are picking up the **NEST** project — a women-only friendship app for
> international students in Madrid; the product owner is the client, **Diana**.
>
> First, read `CLAUDE.md` and `docs/HANDOFF.md` in this repo: they hold the rules
> and the current state. Everything in this project stays **in English** (code,
> comments, UI copy, commits, docs). Follow the guardrails in `CLAUDE.md`, and
> don't build any approval-gated feature without an explicit go-ahead. Deploy by
> pushing to `main`; never touch secrets or Diana's account.
>
> **Current focus:** finishing the handover to Diana and the open items in
> `docs/HANDOFF.md`.
>
> Before changing anything, give me a short read-back of the current state and
> what you'd tackle first.
