# Push notifications

NEST sends real Web Push notifications — they reach a member's phone or
computer through her browser's push service even while NEST is closed.
No third-party notification provider is involved: the standard Web Push
protocol (VAPID) runs directly from `server/push.ts` via the `web-push`
library, and the service worker (`public/sw.js`) displays the notification
and deep-links on tap.

## What gets sent, and when

| Trigger | Recipients | Preference category |
| --- | --- | --- |
| New message | the matched recipient (never the sender) | Messages |
| New match | both members | Matches |
| A like that isn't a match yet | the liked member (anonymous copy) | Likes |
| Outing proposal / reply | the other member | Outings |
| "Starts soon" outing reminder (daily cron) | both members | Outing reminders |
| Event cancelled | its attendees | Event updates |
| **New Experience published** | every opted-in subscribed member | New NEST Experiences |
| **Admin announcement** (dashboard → Announcements) | every opted-in subscribed member | NEST announcements |

Guests (Events Only) have no accounts and can never register subscriptions.
Payloads never contain message text, WhatsApp numbers, or anything another
member couldn't already see.

## How members enable it

One calm onboarding step after first login ("Don't miss a thing 💌"), or
anytime from Profile → Account → Notifications. The browser's permission
dialog appears only after she taps Enable. Per-category toggles live in the
same place and are enforced server-side. Signing out detaches the device
from her account; whoever signs in next re-attaches it to their own account
automatically. On iPhone, Web Push requires NEST to be installed on the
Home Screen first (iOS 16.4+) — the UI explains this.

## Broadcasts are jobs, not loops

Fan-out sends (Experiences, announcements) are recorded as
`notificationJobs` rows and delivered in chunks with progress persisted
after every chunk, so a serverless timeout can delay but never duplicate a
broadcast (each trigger has a dedupe key). Interrupted jobs resume when an
admin opens the Announcements tab or when the daily cron runs. The admin
panel shows honest accounting: "accepted" means a push service took the
message, not that the member saw it. Endpoints reported dead (404/410) are
pruned automatically.

## Configuration

Four production environment variables (see `.env.example`):
`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (server-only, never in client code
or git), `VAPID_SUBJECT`, and `CRON_SECRET` (authorizes the daily
`/api/push/run-reminders` cron, which Vercel sends automatically as a
Bearer header). Without the keys the whole system is a safe no-op: the UI
says notifications aren't switched on yet, and nothing pretends to send.

Local sandboxes can test real delivery by generating a throwaway pair with
`npx web-push generate-vapid-keys` — never reuse the production private key
locally.
