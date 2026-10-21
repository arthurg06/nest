// Real Web Push delivery (VAPID). Notifications reach the member's devices
// through the browser push services even while NEST is closed — nothing here
// is simulated in-page UI.
//
// Configuration comes exclusively from server-side environment variables:
//   VAPID_PUBLIC_KEY   — shared with browsers (public by design)
//   VAPID_PRIVATE_KEY  — secret, never leaves the server
//   VAPID_SUBJECT      — mailto: or https: contact (defaults sensibly)
// Without keys every send is a silent no-op and subscription endpoints say
// so, keeping local sandboxes fully functional.

import webpush from "web-push";
import type { DbSchema, NotificationPrefs, PushSubscriptionRecord, User } from "./db.js";

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: true,
  messages: true,
  matches: true,
  likes: true,
  outings: true,
  outingReminders: true,
  eventUpdates: true,
  experiences: true,
  announcements: true,
};

export type PushCategory = keyof Omit<NotificationPrefs, "enabled"> | "system";

export interface PushNote {
  title: string;
  body: string;
  /** In-app destination, e.g. "/?open=chat&match=abc" — the service worker
      deep-links there on click. */
  url: string;
  /** Collapse key so repeated notes replace instead of stack. */
  tag?: string;
}

let configured = false;

/** The one function that talks to the push services — swappable in tests so
    delivery logic is verifiable without network access. */
type DeliverFn = (
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string
) => Promise<unknown>;

const realDeliver: DeliverFn = (sub, payload) =>
  webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);

let deliver: DeliverFn = realDeliver;

/** Test seam (vitest only): fake the transport and/or the configured flag.
    Refuses to do anything outside the test environment. */
export function __setPushForTests(opts: { deliver?: DeliverFn | null; configured?: boolean }): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("__setPushForTests is only available in the test environment");
  }
  if ("deliver" in opts) deliver = opts.deliver ?? realDeliver;
  if (typeof opts.configured === "boolean") configured = opts.configured;
}

export function isPushConfigured(): boolean {
  return configured;
}

export function initPush(): void {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;
  const subject = process.env.VAPID_SUBJECT || "https://nestclub.es";
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } catch (err) {
    // A malformed key must degrade to "push unconfigured", never take the
    // whole API down — this runs at module load on every serverless start.
    configured = false;
    console.error("Push disabled: invalid VAPID configuration:", (err as Error).message);
  }
}

export function vapidPublicKey(): string | null {
  return configured ? process.env.VAPID_PUBLIC_KEY || null : null;
}

/** The member's effective preferences (absent record = everything on). */
export function prefsFor(user: User): NotificationPrefs {
  return { ...DEFAULT_NOTIFICATION_PREFS, ...(user.notificationPrefs || {}) };
}

function wantsCategory(user: User, category: PushCategory): boolean {
  const prefs = prefsFor(user);
  if (!prefs.enabled) return false;
  // "system" (important account/NEST announcements) is governed by the
  // master switch only.
  if (category === "system") return true;
  return prefs[category] !== false;
}

/** Honest per-attempt accounting for one batch of delivery attempts.
    "accepted" means the push service took the message — never proof that the
    member actually saw the notification. */
export interface DeliveryTally {
  accepted: number;
  failed: number;
  expired: number;
  /** Endpoints the push service reported gone (404/410) — prune these. */
  deadEndpoints: string[];
}

/**
 * Attempt delivery of one note to a set of subscriptions and report exactly
 * what happened. Never throws: a push failure must never fail the request or
 * job that caused it.
 */
export async function pushToSubscriptions(
  subs: PushSubscriptionRecord[],
  note: PushNote
): Promise<DeliveryTally> {
  const tally: DeliveryTally = { accepted: 0, failed: 0, expired: 0, deadEndpoints: [] };
  if (!configured || subs.length === 0) return tally;

  const payload = JSON.stringify({
    title: note.title,
    body: note.body,
    url: note.url,
    tag: note.tag || "nest",
  });

  await Promise.all(
    subs.map(sub =>
      deliver({ endpoint: sub.endpoint, keys: sub.keys }, payload)
        .then(() => {
          tally.accepted++;
        })
        .catch((err: any) => {
          const code = err?.statusCode;
          if (code === 404 || code === 410) {
            tally.expired++;
            tally.deadEndpoints.push(sub.endpoint);
          } else {
            tally.failed++;
          }
        })
    )
  );
  return tally;
}

/** Remove subscriptions whose endpoints a push service reported dead. */
export function pruneDeadSubscriptions(db: DbSchema, deadEndpoints: string[]): void {
  if (deadEndpoints.length === 0) return;
  db.pushSubscriptions = db.pushSubscriptions.filter(s => !deadEndpoints.includes(s.endpoint));
}

/**
 * Push one note to every device a member registered, honoring her category
 * preferences. Endpoints the push service reports gone (404/410) are removed
 * from `db` in place — callers persist that with their own writeDb, so the
 * cleanup rides along with the request's normal write.
 */
export async function sendPushToUser(
  db: DbSchema,
  userId: string,
  category: PushCategory,
  note: PushNote
): Promise<void> {
  if (!configured) return;
  const user = db.users.find(u => u.id === userId);
  if (!user || !wantsCategory(user, category)) return;

  const subs = db.pushSubscriptions.filter(s => s.userId === userId);
  if (subs.length === 0) return;

  const tally = await pushToSubscriptions(subs, { ...note, tag: note.tag || category });
  pruneDeadSubscriptions(db, tally.deadEndpoints);
}

/** Does this member currently want pushes of this category? (Exported for the
    broadcast recipient selection in server.ts.) */
export function userWantsCategory(user: User, category: PushCategory): boolean {
  return wantsCategory(user, category);
}
