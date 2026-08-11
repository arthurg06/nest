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
- **Fix:** the account only handles login/billing — it does not carry the
  project. Whichever Claude account she is signed into, she must **open her local
  `nest` folder** (cloned into her home directory, e.g. `/Users/a/nest`). She is
  currently working on **Arthur's** Claude account (his call); note that means
  she can also see his other Claude conversations and projects.
- Her clone predates `CLAUDE.md`, so her first action must be a **`git pull`**.

## Pending (owner actions / decisions)

- [ ] **Diana:** in Claude Code, **open the local `nest` folder** (opening the
      folder is what surfaces the project — the signed-in account only handles
      login), then paste the first-session prompt below.
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

## First-session prompt (paste this to start)

Diana drives this from the Claude desktop app (currently on Arthur's account).
Once the `nest` folder is open, paste:

> You're helping **Diana**, the product owner of **NEST** — a women-only
> friendship app for international students in Madrid. She is non-technical and is
> driving you from the Claude desktop app on her own Mac, so guide her in plain
> language and confirm before anything irreversible.
>
> **Set up this session:**
> 1. Work in her local `nest` folder on this Mac (the clone in her home folder,
>    e.g. `/Users/a/nest`). If it isn't open yet, tell her how to open it.
> 2. Run `git pull`, then read `CLAUDE.md`, `docs/HANDOFF.md`, and `docs/DEV_SETUP.md`.
> 3. Install anything missing, start the app locally, and give her the address to open.
> 4. Explain, simply, how she makes a change and publishes it (edit → check it
>    locally → you commit and push → the live site updates on its own).
>
> **Ground rules (from `CLAUDE.md`):** everything stays in English; never print or
> change passwords, secrets, or real member data; don't build any approval-gated
> feature without her explicit go-ahead; deploy only by pushing to `main`.
>
> **Current focus:** getting Diana set up and working, plus the open items in
> `docs/HANDOFF.md`. Start by confirming the folder is open and giving her a
> short, plain-language read-back of where the project stands.
