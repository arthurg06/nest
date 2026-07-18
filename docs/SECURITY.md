# Security Decisions

## Passwords

- scrypt (N=16384, r=8, p=1, 64-byte key, 16-byte random salt), parameters
  embedded per record so they can be raised without breaking old hashes.
- Legacy prototype records stored plain text. They are verified with a
  constant-time comparison **only when the stored value has no scrypt
  prefix**, and are re-hashed immediately on the first successful login, so
  plain text disappears from the database organically. Plain-text fields are
  never treated as hashes. (Alternative if a hard cutoff is ever wanted:
  force a password reset for remaining legacy rows.)
- Passwords and hashes are never logged and never returned by any API.

## Sessions

- 256-bit `crypto.randomBytes` bearer tokens (base64url), 30-day expiry.
- Logout deletes the presented token server-side; account deletion and
  suspension revoke all of a user's sessions; expired sessions are swept on
  login and on use.
- Honest limitation: tokens are stored in the JSON database and in browser
  `localStorage`. This is a development-grade arrangement — the hosted-DB
  migration should introduce hashed-at-rest tokens (or signed tokens) and
  consider httpOnly cookies / Keychain storage for the packaged app.

## Rate limiting & abuse

- In-memory fixed windows: login 10/15min per IP+email, signup 10/h per IP,
  uploads 30/h per IP. Generic auth error messages.
- Limitation: per-process memory — on serverless each instance counts
  separately; a shared store (Redis/Upstash) is needed for real-world
  guarantees. Documented, not overstated.

## Uploads

- Unauthenticated by design **only** because onboarding uploads the profile
  photo before the account exists; compensating controls: rate limit, MIME
  allowlist, 8 MB cap, magic-byte content sniffing (declared type is not
  trusted), server-generated random filenames, no client input in paths.
- Future hardening: deferred upload (after signup) to allow full
  authentication, plus a sweep for abandoned files.
- Uploaded files are publicly served by URL — do not use this pipeline for
  sensitive documents (see ADMIN_AND_VERIFICATION.md).

## Authorization

- Persistent server-side roles; every admin route enforces `role === "admin"`.
- Profile updates are whitelisted: verification status, premium flags, and
  role are not settable by clients. Premium entitlement is computed
  server-side from Stripe-driven state.

## Payment data

- No card numbers, expiries, or CVCs exist anywhere in this codebase — the
  previous fake payment form was removed. Stripe-hosted Checkout only.
- Webhooks are signature-verified against the raw body and idempotent.
- No payment data is ever logged.

## Known residual risks (tracked, not hidden)

1. JSON-file persistence (integrity, concurrency, ephemerality on Vercel).
2. Bearer tokens at rest in the JSON DB and localStorage.
3. Rate limits are per-instance.
4. No email verification of account addresses yet.
5. Reporting/blocking (user safety) not yet implemented — required before
   real users meet through the app.
