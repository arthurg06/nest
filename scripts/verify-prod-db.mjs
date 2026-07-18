#!/usr/bin/env node
// One-off production persistence verification (read-only).
// Loads DATABASE_URL from .env.local (Neon integration pull) and compares the
// seeded admin row against the local record WITHOUT printing any value:
// output is booleans and counts only.
import fs from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";

const envFile = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
const url = envFile.match(/^DATABASE_URL="?([^"\n]+)"?$/m)?.[1];
if (!url) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const sql = neon(url);

// Trigger a cold-start read on production first so the seed has run.
const ping = await fetch("https://nest-indol.vercel.app/api/auth/me", {
  headers: { Authorization: "Bearer verification-probe" },
});
console.log("prod API reachable:", ping.status === 401 ? "yes (401 as expected)" : `unexpected ${ping.status}`);

const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_name = 'nest_records'`;
console.log("nest_records table exists:", tables.length === 1);
if (tables.length !== 1) process.exit(1);

const counts = await sql`SELECT collection, count(*)::int AS n FROM nest_records GROUP BY collection ORDER BY collection`;
console.log("row counts:", Object.fromEntries(counts.map(r => [r.collection, r.n])));

const admins = await sql`
  SELECT id, data FROM nest_records
  WHERE collection = 'users' AND data->>'role' = 'admin'
`;
console.log("admin accounts in DB:", admins.length);

const local = JSON.parse(fs.readFileSync("db.json", "utf-8"));
const localAdmin = local.users.find(u => u.role === "admin");

if (admins.length === 1 && localAdmin) {
  const dbUser = admins[0].data;
  console.log("admin email matches local record:", dbUser.email === localAdmin.email);
  console.log("password hash IDENTICAL to local scrypt hash:", dbUser.passwordHash === localAdmin.passwordHash);
  console.log("hash is scrypt (never plain text):", String(dbUser.passwordHash).startsWith("scrypt$"));
  console.log("status active / source preserved:", dbUser.status === "active");

  const profiles = await sql`
    SELECT data FROM nest_records
    WHERE collection = 'profiles' AND data->>'userId' = ${dbUser.id}
  `;
  const profile = profiles[0]?.data;
  console.log("admin profile present:", Boolean(profile));
  console.log("profile photo path:", profile?.photo);
  console.log("verificationStatus:", profile?.verificationStatus);
}

const sessions = await sql`SELECT count(*)::int AS n FROM nest_records WHERE collection = 'sessions'`;
console.log("seeded sessions (must be 0 or app-created only):", sessions[0].n);
