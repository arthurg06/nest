#!/usr/bin/env node
// Assigns a local image file as a member's profile photo.
//
//   node scripts/set-profile-photo.mjs --email member@example.com --file /path/to/photo.jpg
//
// The image is copied into the uploads directory (gitignored) using the same
// random filename pattern as the in-app uploader, and the member's profile in
// the local JSON database is updated to reference it. The member is located
// by account email — a stable identifier — so no personal data needs to be
// hardcoded anywhere in the codebase. Local/admin use only.

import fs from "fs";
import path from "path";
import crypto from "crypto";

const args = process.argv.slice(2);
const get = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};

const email = get("--email");
const file = get("--file");

if (!email || !file) {
  console.error("Usage: node scripts/set-profile-photo.mjs --email <email> --file <image>");
  process.exit(1);
}

const DB_FILE = process.env.DB_PATH || path.join(process.cwd(), "db.json");
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

const ALLOWED_EXT = { ".jpg": "jpg", ".jpeg": "jpg", ".png": "png", ".webp": "webp" };
const ext = ALLOWED_EXT[path.extname(file).toLowerCase()];
if (!ext) {
  console.error("Only .jpg, .jpeg, .png, and .webp files are supported.");
  process.exit(1);
}
if (!fs.existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}
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
const profile = db.profiles.find(p => p.userId === user.id);
if (!profile) {
  console.error(`No profile found for ${email}`);
  process.exit(1);
}

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const fileName = `${Date.now()}_${crypto.randomBytes(6).toString("base64url")}.${ext}`;
fs.copyFileSync(file, path.join(UPLOAD_DIR, fileName));

const previous = profile.photo;
profile.photo = `/uploads/${fileName}`;

const tmp = `${DB_FILE}.tmp`;
fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf-8");
fs.renameSync(tmp, DB_FILE);

console.log(`Profile photo updated for ${email}`);
console.log(`  previous: ${previous}`);
console.log(`  new:      ${profile.photo}`);
