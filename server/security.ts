import crypto from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(crypto.scrypt) as (
  password: crypto.BinaryLike,
  salt: crypto.BinaryLike,
  keylen: number,
  options: crypto.ScryptOptions
) => Promise<Buffer>;

// scrypt parameters (N=2^14, r=8, p=1, 64-byte key) — the widely used
// interactive-login baseline. Parameters are embedded in each stored hash so
// they can be raised later without breaking existing records.
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function isHashedPassword(stored: string): boolean {
  return typeof stored === "string" && stored.startsWith("scrypt$");
}

// Verifies a password against a stored value. Legacy records from the
// prototype era hold plain text; callers MUST re-hash after a successful
// legacy verification (see the login handler) so plain text disappears from
// the database the first time each user signs in.
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!isHashedPassword(stored)) {
    const a = Buffer.from(password);
    const b = Buffer.from(stored);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  const parts = stored.split("$");
  if (parts.length !== 6) return false;
  const [, nStr, rStr, pStr, saltB64, hashB64] = parts;
  const salt = Buffer.from(saltB64, "base64url");
  const expected = Buffer.from(hashB64, "base64url");
  const actual = await scryptAsync(password, salt, expected.length, {
    N: Number(nStr),
    r: Number(rStr),
    p: Number(pStr),
    maxmem: 256 * 1024 * 1024
  });
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

// 256-bit cryptographically secure bearer token.
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

// Collision-resistant random entity ID.
export function generateSecureId(): string {
  return crypto.randomBytes(12).toString("base64url");
}

// Detects the true image type from file content rather than trusting the
// client-declared MIME type.
export function sniffImageType(buffer: Buffer): "png" | "jpg" | "webp" | null {
  if (buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "png";
  }
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }
  if (
    buffer.length > 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}
