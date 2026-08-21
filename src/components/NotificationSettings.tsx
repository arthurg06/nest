import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { apiUrl } from "../lib/api";
import { enablePushNotifications, pushSupported, isIOS, isStandalone } from "../lib/push";

interface Prefs {
  enabled: boolean;
  messages: boolean;
  matches: boolean;
  likes: boolean;
  outings: boolean;
  outingReminders: boolean;
  eventUpdates: boolean;
}

const CATEGORY_LABELS: { key: keyof Prefs; label: string }[] = [
  { key: "messages", label: "Messages" },
  { key: "matches", label: "Matches" },
  { key: "likes", label: "Likes" },
  { key: "outings", label: "Outings" },
  { key: "outingReminders", label: "Outing reminders" },
  { key: "eventUpdates", label: "Event updates" },
];

const authHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${localStorage.getItem("nest_token")}`
});

// Push-notification controls for the profile's Account section. The
// preferences live server-side and the send path honors them — switching a
// category off here genuinely stops that category being sent.
export default function NotificationSettings() {
  const [expanded, setExpanded] = useState(false);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [pushConfigured, setPushConfigured] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    let alive = true;
    fetch(apiUrl("/api/notifications/preferences"), { headers: authHeaders() })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!alive || !d) return;
        setPrefs(d.preferences);
        setHasSubscription(d.hasSubscription);
        setPushConfigured(d.pushConfigured);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [expanded]);

  const save = async (next: Prefs) => {
    setPrefs(next);
    try {
      await fetch(apiUrl("/api/notifications/preferences"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ preferences: next })
      });
    } catch {
      setStatus("Could not save — check your connection.");
    }
  };

  const handleEnableOnThisDevice = async () => {
    if (isIOS() && !isStandalone()) {
      setStatus("On iPhone, add NEST to your Home Screen first — then enable notifications here.");
      return;
    }
    setBusy(true);
    const result = await enablePushNotifications();
    setBusy(false);
    if (result.ok) {
      setHasSubscription(true);
      setStatus("Notifications are on for this device 💌");
    } else if (result.reason === "denied") {
      setStatus("Notifications are blocked for NEST in your browser settings.");
    } else if (result.reason === "unconfigured") {
      setStatus("Notifications aren't switched on for NEST yet — check back soon.");
    } else if (result.reason === "unsupported") {
      setStatus("This browser doesn't support push notifications.");
    } else {
      setStatus("Something went wrong — please try again.");
    }
  };

  const permissionGranted = pushSupported() && Notification.permission === "granted";

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-foreground">Notifications</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Messages, matches, likes and outing reminders — on your terms.
          </p>
        </div>
        {!expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="w-full sm:w-auto shrink-0 bg-card border border-border hover:bg-muted/60 text-foreground font-sans text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer text-center inline-flex items-center justify-center gap-1.5"
          >
            <Bell size={12} />
            <span>Manage</span>
          </button>
        )}
      </div>

      {expanded && (
        <div className="bg-muted/30 border border-border/60 p-4 rounded-xl space-y-3 animate-fade-in">
          {!prefs ? (
            <p className="text-[11px] text-muted-foreground font-sans italic">Loading…</p>
          ) : (
            <>
              {/* This device */}
              {!permissionGranted || !hasSubscription ? (
                <button
                  type="button"
                  onClick={handleEnableOnThisDevice}
                  disabled={busy}
                  className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-sans text-xs font-black py-2.5 rounded-xl transition cursor-pointer"
                >
                  {busy ? "One moment…" : "Enable notifications on this device"}
                </button>
              ) : (
                <p className="text-[11px] font-sans text-success font-bold">✓ Notifications are on for this device</p>
              )}
              {!pushConfigured && (
                <p className="text-[10px] text-muted-foreground font-sans leading-normal">
                  Push delivery isn't configured on the server yet — your choices below are saved for when it is.
                </p>
              )}

              {/* Master switch */}
              <label className="flex items-center justify-between gap-3 pt-1 cursor-pointer select-none">
                <span className="text-xs font-bold text-foreground">Push notifications</span>
                <input
                  type="checkbox"
                  checked={prefs.enabled}
                  onChange={e => save({ ...prefs, enabled: e.target.checked })}
                  className="w-4 h-4 accent-[var(--primary)] cursor-pointer"
                />
              </label>

              {/* Categories */}
              <div className={`space-y-2 ${prefs.enabled ? "" : "opacity-40 pointer-events-none"}`}>
                {CATEGORY_LABELS.map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between gap-3 cursor-pointer select-none">
                    <span className="text-[11px] font-sans text-muted-foreground">{label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(prefs[key])}
                      onChange={e => save({ ...prefs, [key]: e.target.checked })}
                      className="w-4 h-4 accent-[var(--primary)] cursor-pointer"
                    />
                  </label>
                ))}
              </div>

              {status && (
                <p className="text-[10px] font-sans text-muted-foreground leading-normal border-t border-border/50 pt-2.5">{status}</p>
              )}

              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                Close
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
