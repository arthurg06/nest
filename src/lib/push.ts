// Client-side push + device plumbing: service-worker registration, the
// subscription lifecycle against the NEST API, and the platform detection the
// onboarding uses to show the right installation instructions.

import { apiUrl } from "./api";

const authHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${localStorage.getItem("nest_token")}`
});

// ---------------------------------------------------------------------------
// Device / display-mode detection
// ---------------------------------------------------------------------------

export const isIOS = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export const isAndroid = (): boolean => /Android/i.test(navigator.userAgent);

/** True when NEST is running as an installed Home Screen app. */
export const isStandalone = (): boolean =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as any).standalone === true;

export const pushSupported = (): boolean =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

// ---------------------------------------------------------------------------
// Native install prompt (Chrome/Edge/Android). The event fires early in the
// page's life, so it is captured at module load and replayed when the
// onboarding asks for it.
// ---------------------------------------------------------------------------

let deferredInstallPrompt: any = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });
}

export const canPromptNativeInstall = (): boolean => deferredInstallPrompt !== null;

/** Shows the browser's own install sheet; resolves true when she installs. */
export async function promptNativeInstall(): Promise<boolean> {
  if (!deferredInstallPrompt) return false;
  const evt = deferredInstallPrompt;
  deferredInstallPrompt = null;
  evt.prompt();
  const choice = await evt.userChoice.catch(() => ({ outcome: "dismissed" }));
  return choice.outcome === "accepted";
}

// ---------------------------------------------------------------------------
// Service worker + subscription lifecycle
// ---------------------------------------------------------------------------

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export interface SubscribeResult {
  ok: boolean;
  reason?: "unsupported" | "unconfigured" | "denied" | "error";
}

/**
 * The full enable flow: permission (browser prompt), push subscription,
 * registration with the NEST backend. Call only from a user gesture.
 */
export async function enablePushNotifications(): Promise<SubscribeResult> {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };
  try {
    const keyRes = await fetch(apiUrl("/api/push/public-key")).then(r => r.json());
    if (!keyRes.configured || !keyRes.publicKey) return { ok: false, reason: "unconfigured" };

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "denied" };

    const registration = (await registerServiceWorker()) || (await navigator.serviceWorker.ready);
    if (!registration) return { ok: false, reason: "error" };

    const subscription =
      (await registration.pushManager.getSubscription()) ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyRes.publicKey)
      }));

    const res = await fetch(apiUrl("/api/push/subscribe"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ subscription: subscription.toJSON() })
    });
    return res.ok ? { ok: true } : { ok: false, reason: "error" };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** If permission already exists, quietly (re)register this device. */
export async function resyncSubscriptionIfGranted(): Promise<void> {
  if (!pushSupported() || Notification.permission !== "granted") return;
  try {
    const registration = await registerServiceWorker();
    const subscription = registration && (await registration.pushManager.getSubscription());
    if (!subscription) return;
    await fetch(apiUrl("/api/push/subscribe"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ subscription: subscription.toJSON() })
    });
  } catch {
    /* best effort */
  }
}

export async function disablePushOnThisDevice(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    const subscription = registration && (await registration.pushManager.getSubscription());
    if (!subscription) return;
    await fetch(apiUrl("/api/push/unsubscribe"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ endpoint: subscription.endpoint })
    });
    await subscription.unsubscribe();
  } catch {
    /* best effort */
  }
}
