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

**How Diana gets the project — from GitHub, not a file transfer**
- The code does **not** reach her Mac by any file/ZIP transfer (that kept failing —
  a folder copy chokes on `node_modules`). It comes **from GitHub**: Diana is a
  collaborator on `arthurg06/nest`, and she (or her Claude Code) **clones** it.
  Cloning *is* the transfer, and it only pulls the real files — `npm install`
  rebuilds `node_modules`.
- In the Claude desktop app, Claude Code opens **local folders on the machine**,
  not projects "stored in an account" — so signing into any account never makes
  the project appear. She opens a folder, has Claude Code clone the repo into it,
  and works there.
- The repo is currently **public**, so cloning needs no GitHub login. (Once it's
  made private, she signs into GitHub once — she is already a collaborator.)
- She is working on **Arthur's** Claude account (his call); that also means she
  can see his other Claude conversations and projects.

## Pending (owner actions / decisions)

- [ ] **Diana:** in the Claude desktop app, open a folder and paste the
      first-session prompt below — Claude Code **clones `arthurg06/nest` from
      GitHub** (if it isn't already on the Mac) and sets everything up.
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
She opens any folder in the app, then pastes:

> You're helping **Diana**, the product owner of **NEST** — a women-only
> friendship app for international students in Madrid. She is non-technical and is
> driving you from the Claude desktop app on her Mac, so guide her in plain
> language and confirm before anything irreversible.
>
> The project lives on GitHub at `https://github.com/arthurg06/nest` and Diana is
> a collaborator. **The code may not be on this Mac yet.** So:
>
> 1. Look in the open folder for a `nest` project. If it isn't there, **clone it
>    from GitHub**: `git clone https://github.com/arthurg06/nest.git` (the repo is
>    public, so no login is needed; if git ever asks her to sign in, walk her
>    through it).
> 2. Move into the `nest` folder, run `git pull` to be current, then read
>    `CLAUDE.md`, `docs/HANDOFF.md`, and `docs/DEV_SETUP.md`.
> 3. Install anything missing (install Node.js if `npm` is not found), start the
>    app locally, and give her the address to open in her browser.
> 4. Explain, simply, how she makes a change and publishes it (edit → check it
>    locally → you commit and push → the live site updates on its own).
>
> **Ground rules (from `CLAUDE.md`):** everything stays in English; never print or
> change passwords, secrets, or real member data; don't build any approval-gated
> feature without her explicit go-ahead; deploy only by pushing to `main`.
>
> Start by telling her whether the project was already here or needed cloning,
> then give a short, plain-language read-back of where NEST stands.
