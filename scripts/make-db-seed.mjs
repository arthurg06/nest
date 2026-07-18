#!/usr/bin/env node
// Builds a DB_SEED value for ephemeral preview deployments.
//
//   node scripts/make-db-seed.mjs --email member@example.com [--photo /seed/admin-photo.jpg]
//
// Extracts ONE member (user + profile) from the local JSON database and
// prints a base64 seed to stdout, meant to be piped straight into
//   … | vercel env add DB_SEED production
// so the value is never displayed or written to disk.
//
// Safety rails:
// - refuses to export a record whose password is not scrypt-hashed
//   (plain-text credentials must never leave the machine)
// - sessions and other members are never included
// - the optional --photo argument rewrites the profile photo to a path that
//   exists on the deployment (local /uploads files are not deployed)

import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const get = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};

const email = get("--email");
const photo = get("--photo");

if (!email) {
  console.error("Usage: node scripts/make-db-seed.mjs --email <email> [--photo <deployed-path>]");
  process.exit(1);
}

const DB_FILE = process.env.DB_PATH || path.join(process.cwd(), "db.json");
if (!fs.existsSync(DB_FILE)) {
  console.error(`Database not found: ${DB_FILE}`);
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`No account found for ${email}`);
  process.exit(1);
}
if (!String(user.passwordHash).startsWith("scrypt$")) {
  console.error("Refusing: the stored password is not scrypt-hashed. Log in locally once (or run the migration) so plain text never leaves this machine.");
  process.exit(1);
}
const profile = db.profiles.find(p => p.userId === user.id);
if (!profile) {
  console.error(`No profile found for ${email}`);
  process.exit(1);
}

const seededProfile = { ...profile };
if (photo) seededProfile.photo = photo;

const seed = {
  users: [{ ...user, lastActiveAt: undefined }],
  profiles: [seededProfile]
};

process.stdout.write(Buffer.from(JSON.stringify(seed)).toString("base64"));
