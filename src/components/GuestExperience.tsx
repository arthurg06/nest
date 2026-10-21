import React, { useEffect, useState } from "react";
import { Event } from "../types";
import Events from "./Events";
import { apiUrl } from "../lib/api";
import { Sparkles, MessageSquare, MapPin, Calendar, User, X } from "lucide-react";

interface GuestExperienceProps {
  /** Leave guest mode and return to the welcome / authentication page. */
  onExitToAuth: () => void;
}

// The whole Guest (Events Only) surface: the Experiences tab fed by the
// public guest endpoints, the familiar bottom navigation where every other
// tab opens the users-only popup, and nothing that can reach member data.
// A guest is never a session — no token exists; the only thing kept is a
// random browser id so her own registrations are recognised (and the
// server treats that id as a dedup key, never an identity).

const GUEST_ID_KEY = "nest_guest_id";

function getGuestId(): string {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, "");
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  } catch {
    // Storage unavailable (private browsing quirks): a per-pageload id
    // still lets her RSVP; only the "You're Registered" memory is lost.
    return `g${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`;
  }
}

export default function GuestExperience({ onExitToAuth }: GuestExperienceProps) {
  const [guestId] = useState(getGuestId);
  const [events, setEvents] = useState<Event[]>([]);
  const [showUsersOnly, setShowUsersOnly] = useState(false);

  const loadEvents = async () => {
    try {
      const res = await fetch(apiUrl(`/api/guest/events?guestId=${encodeURIComponent(guestId)}`));
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setEvents(data);
    } catch {
      /* transient — she can retry by reopening */
    }
  };

  useEffect(() => {
    loadEvents();

    // Deep links into members-only areas ("/?open=chat" …) get the same
    // users-only popup instead of silently landing somewhere restricted.
    const params = new URLSearchParams(window.location.search);
    const open = params.get("open");
    if (open && open !== "events") setShowUsersOnly(true);
    if (open) {
      ["open", "match", "event"].forEach(k => params.delete(k));
      const url = new URL(window.location.href);
      url.search = params.toString();
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guest booking: names + WhatsApp number, validated again server-side.
  const handleGuestRsvp = async (
    eventId: string,
    details?: { whatsapp: string; firstName?: string; lastName?: string }
  ): Promise<{ ok: boolean; full?: boolean; error?: string }> => {
    if (!details) {
      // Guests have no cancel path — nothing to do without details.
      return { ok: false, error: "Please fill in your details to RSVP." };
    }
    try {
      const res = await fetch(apiUrl(`/api/guest/events/${eventId}/rsvp`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId,
          firstName: details.firstName,
          lastName: details.lastName,
          whatsapp: details.whatsapp
        })
      });
      const data = await res.json();
      if (res.ok) {
        loadEvents();
        return { ok: true };
      }
      return { ok: false, full: data.full === true, error: data.error };
    } catch {
      return { ok: false, error: "Something went wrong. Please try again." };
    }
  };

  const guestTabs = [
    { id: "swipe", label: "Swipes", icon: <Sparkles size={18} /> },
    { id: "chat", label: "Chat", icon: <MessageSquare size={18} /> },
    { id: "city", label: "City", icon: <MapPin size={18} /> },
    { id: "events", label: "Experiences", icon: <Calendar size={18} /> },
    { id: "profile", label: "Profile", icon: <User size={18} /> }
  ];

  return (
    <div className="h-[100dvh] overflow-hidden text-foreground flex flex-col antialiased">
      {/* Header: brand + the way back into real membership */}
      <header className="shrink-0 bg-card/60 backdrop-blur-xl border-b border-border/40 px-4 md:px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 select-none">
          <img src="/icons/nest-logo.png" alt="NEST logo" className="w-9 h-9 rounded-xl object-cover shadow-sm border border-border/50" />
          <div>
            <span className="font-display font-semibold tracking-tight text-foreground text-xl lowercase leading-none block">nest</span>
            <span className="font-mono text-[8px] font-bold text-primary tracking-widest uppercase">Madrid · Guest</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onExitToAuth}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-sans text-xs font-black px-4 py-2 rounded-xl transition shadow-pop cursor-pointer"
        >
          Sign Up / Log In
        </button>
      </header>

      {/* The one surface guests have: NEST Experiences */}
      <main className="flex-1 min-h-0 max-w-7xl w-full mx-auto p-4 md:p-6 overflow-y-auto -mx-0">
        <Events
          events={events}
          onRsvp={handleGuestRsvp}
          isAdmin={false}
          guest
          onAddEvent={() => {}}
        />
      </main>

      {/* Familiar bottom navigation — every tab except Experiences opens
          the users-only popup and leaves her exactly where she was. */}
      <nav className="shrink-0 bg-card/80 backdrop-blur-xl border-t border-border/50 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {guestTabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { if (tab.id !== "events") setShowUsersOnly(true); }}
              className={`flex flex-col items-center gap-1 px-3 py-1 transition cursor-pointer ${
                tab.id === "events" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-sans">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Users-only popup — closing keeps her browsing as a guest */}
      {showUsersOnly && (
        <div
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-[90] animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Users only"
        >
          <div className="bg-card rounded-[32px] border border-border max-w-sm w-full shadow-2xl p-6 pt-8 text-center space-y-3 animate-scale-up relative">
            <button
              onClick={() => setShowUsersOnly(false)}
              aria-label="Close"
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground p-2.5 rounded-full hover:bg-muted transition cursor-pointer"
            >
              <X size={16} />
            </button>
            <span className="text-3xl block select-none">🪺</span>
            <h3 className="font-sans font-black text-base text-foreground leading-snug">Oops!</h3>
            <p className="font-sans text-xs text-muted-foreground leading-relaxed">
              This feature is for users only. Become a user by creating a profile.
            </p>
            <button
              onClick={onExitToAuth}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-sans text-xs font-black py-3 rounded-2xl transition shadow-pop cursor-pointer"
            >
              Sign Up / Log In
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
