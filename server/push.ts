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
import type { DbSchema, NotificationPrefs, User } from "./db.js";

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: true,
  messages: true,
  matches: true,
  likes: true,
  outings: true,
  outingReminders: true,
  eventUpdates: true,
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

export function isPushConfigured(): boolean {
  return configured;
}

export function initPush(): void {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;
  const subject = process.env.VAPID_SUBJECT || "https://nest-indol.vercel.app";
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
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

  const payload = JSON.stringify({
    title: note.title,
    body: note.body,
    url: note.url,
    tag: note.tag || category,
  });

  const dead: string[] = [];
  await Promise.all(
    subs.map(sub =>
      webpush
        .sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
        .catch((err: any) => {
          const code = err?.statusCode;
          if (code === 404 || code === 410) dead.push(sub.endpoint);
          // Other failures (network, throttling) are dropped silently — a
          // missed notification must never fail the request that caused it.
        })
    )
  );
  if (dead.length > 0) {
    db.pushSubscriptions = db.pushSubscriptions.filter(s => !dead.includes(s.endpoint));
  }
}
