# NEST — setup & handoff

Everything you need to run, change, and ship NEST from your own Mac.

You don't need anyone's local folder or a file transfer. The whole project lives
in two places:

- **GitHub** (`arthurg06/nest`) — all the source code.
- **Vercel** — hosting + production. Push to the `main` branch and it deploys
  itself to **https://nest-indol.vercel.app**. No manual deploy step.

---

## The easy way: let Claude Code do it

The Claude desktop app includes Claude Code, so you can drive everything by
chatting — no terminal knowledge needed.

1. Open the Claude desktop app and open the **`nest` folder** as your working
   folder.
2. Ask it: *"Read CLAUDE.md and docs/DEV_SETUP.md, then get me set up and run
   the app."*
3. It installs what's needed, starts the app, and gives you the local address to
   open in your browser.

After that you just describe the change you want; it edits the code, you check it
locally, and when you're happy you tell it to **publish** — it commits and
pushes, and the live site updates on its own.

## Two one-time installs

1. **Node.js 20+** — https://nodejs.org (the "LTS" macOS installer). Gives you
   `node` and `npm`.
2. **Git** — usually already on a Mac; if not, running any `git` command triggers
   the install prompt.

(If `npm run dev` has already worked on your machine, both are done.)

## Doing it yourself in a terminal (optional alternative)

```bash
cd nest
npm install
npm run dev
```

Open the address it prints — usually **http://localhost:3000**. Leave that
terminal window open; it's what keeps the local site running.

- Run the tests: `npm test`
- Publish a change: `git add -A` → `git commit -m "what you changed"` → `git push`

## Secrets (`.env.local`) — later, not needed to start

The app runs on a **local test database** with zero setup — a safe sandbox to
experiment in. To work against the **real data**, you need a file named
`.env.local` at the project root. Arthur sends it to you **once**, through a
password manager (e.g. **Bitwarden Send**) — **never by email**. Drop it into the
`nest` folder and restart the app.

Heads-up: those values point at the **live production database**, so be careful
what you change while they're active. Setting up a separate development database
is worth doing before anything risky.

## Never commit these

`.env.local`, `db.json`, and anything under `uploads/` are already in
`.gitignore` — leave them there. They hold secrets or real member data.

---

The full project rules and architecture are in **`CLAUDE.md`** at the project root.
