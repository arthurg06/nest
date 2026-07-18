import React, { useMemo, useState } from "react";
import { MapPin, Search, Navigation, Check, X } from "lucide-react";
import { UserProfile, Recommendation } from "../types";
import {
  ACTIVITIES,
  ActivityId,
  Place,
  SUGGESTED_PLACES,
  areaLabel,
  campusPlaces,
  planTitle,
  rankPlaces,
  universityAreaId,
} from "../../shared/places";

export interface OutingDraft {
  activity: string;
  title: string;
  placeName: string;
  placeArea?: string;
  placeAddress?: string;
  date: string;
  time: string;
  note?: string;
}

interface OutingPlannerProps {
  currentUser: UserProfile;
  otherUser: UserProfile;
  /** Member-submitted City Guide spots, folded into the suggestions. */
  recommendations: Recommendation[];
  onSend: (draft: OutingDraft) => Promise<void> | void;
  onCancel: () => void;
  sending?: boolean;
  error?: string;
}

// Built from local parts on purpose: toISOString() yields the UTC date, so
// between midnight and 02:00 in Madrid "Today" resolved to yesterday.
const isoDate = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};

// Saturday of the current week (or today if it already is the weekend)
const nextWeekend = (): string => {
  const d = new Date();
  const daysUntilSaturday = (6 - d.getDay() + 7) % 7;
  return isoDate(daysUntilSaturday);
};

const prettyDate = (value: string): string => {
  if (value === isoDate(0)) return "Today";
  if (value === isoDate(1)) return "Tomorrow";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
};

export default function OutingPlanner({
  currentUser,
  otherUser,
  recommendations,
  onSend,
  onCancel,
  sending = false,
  error,
}: OutingPlannerProps) {
  const [activity, setActivity] = useState<ActivityId | null>(null);
  const [query, setQuery] = useState("");
  const [place, setPlace] = useState<Place | null>(null);
  const [customPlace, setCustomPlace] = useState("");
  const [date, setDate] = useState(isoDate(1));
  const [time, setTime] = useState("17:00");
  const [note, setNote] = useState("");
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  // Suggestions: the curated seed list, campus options for both members'
  // universities, and spots members added to the City Guide.
  const allPlaces = useMemo<Place[]>(() => {
    const fromGuide: Place[] = recommendations.map(rec => ({
      id: `guide-${rec.id}`,
      name: rec.name,
      areaId: "guide",
      address: rec.address,
      activities: ["coffee", "study", "walk", "food", "culture", "shopping", "move"] as ActivityId[],
    }));
    const campuses = [
      ...campusPlaces(otherUser.university),
      ...(currentUser.university && currentUser.university !== otherUser.university
        ? campusPlaces(currentUser.university)
        : []),
    ];
    // De-duplicate campus entries by generated name
    const seen = new Set<string>();
    const unique = [...campuses, ...fromGuide, ...SUGGESTED_PLACES].filter(p => {
      if (seen.has(p.name)) return false;
      seen.add(p.name);
      return true;
    });
    return unique;
  }, [recommendations, currentUser.university, otherUser.university]);

  const uniAreaId = useMemo(
    () => universityAreaId(otherUser.university) || universityAreaId(currentUser.university),
    [currentUser.university, otherUser.university]
  );

  const ranked = useMemo(
    () => rankPlaces({ places: allPlaces, activity, universityAreaId: uniAreaId, origin, query }).slice(0, 8),
    [allPlaces, activity, uniAreaId, origin, query]
  );

  // Device position is requested only on demand, used only to order the list
  // above, and never sent anywhere.
  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  };

  const chosenName = place?.name || customPlace.trim();
  const canSend = Boolean(chosenName) && Boolean(date) && Boolean(time) && !sending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    onSend({
      activity: activity || "meet",
      title: planTitle(activity, chosenName),
      placeName: chosenName,
      placeArea: place && place.areaId !== "campus" && place.areaId !== "guide" ? areaLabel(place.areaId) : undefined,
      placeAddress: place?.address,
      date,
      time,
      note: note.trim() || undefined,
    });
  };

  const dateChips = [
    { label: "Today", value: isoDate(0) },
    { label: "Tomorrow", value: isoDate(1) },
    { label: "Weekend", value: nextWeekend() },
  ];

  return (
    <form onSubmit={submit} className="flex flex-col h-full min-h-0">
      <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between shrink-0">
        <div>
          <h4 className="font-sans font-black text-xs text-foreground uppercase tracking-wider">Plan an outing</h4>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            With {otherUser.name.split(" ")[0]} — she can accept or suggest another time.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close the planner"
          className="p-2 -m-1 rounded-full hover:bg-muted text-muted-foreground"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-5 -mx-0">
        {/* 1 — What */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono font-black text-muted-foreground uppercase tracking-widest block">
            What
          </span>
          <div className="flex flex-wrap gap-1.5">
            {ACTIVITIES.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => setActivity(activity === a.id ? null : a.id)}
                aria-pressed={activity === a.id}
                className={`px-3 py-2 rounded-xl text-[11px] font-sans font-bold border transition ${
                  activity === a.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card/60 text-foreground border-border/60 hover:bg-card"
                }`}
              >
                <span aria-hidden="true">{a.emoji}</span> {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2 — Where */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono font-black text-muted-foreground uppercase tracking-widest">
              Where
            </span>
            <button
              type="button"
              onClick={useMyLocation}
              className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline px-2 py-1 -m-1"
            >
              <Navigation size={11} />
              {locating ? "Locating…" : origin ? "Sorted by distance" : "Near me"}
            </button>
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search a place, or type your own below"
              className="w-full bg-card/60 border border-border/60 rounded-xl pl-8 pr-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            {ranked.map(p => {
              const selected = place?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPlace(selected ? null : p);
                    setCustomPlace("");
                  }}
                  aria-pressed={selected}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition flex items-start gap-2 ${
                    selected
                      ? "bg-primary/10 border-primary"
                      : "bg-card/50 border-border/50 hover:bg-card/80"
                  }`}
                >
                  <MapPin size={13} className={`shrink-0 mt-0.5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="min-w-0">
                    <span className="block text-[11px] font-bold text-foreground truncate">{p.name}</span>
                    <span className="block text-[10px] text-muted-foreground truncate">
                      {p.areaId === "campus" || p.areaId === "guide" ? p.address : `${areaLabel(p.areaId)} · ${p.address}`}
                    </span>
                  </span>
                  {selected && <Check size={14} className="text-primary shrink-0 ml-auto mt-0.5" />}
                </button>
              );
            })}
            {ranked.length === 0 && (
              <p className="text-[11px] text-muted-foreground px-1 py-2">
                No match in the suggestions — type your own place below.
              </p>
            )}
          </div>

          <input
            type="text"
            value={customPlace}
            onChange={e => {
              setCustomPlace(e.target.value);
              if (e.target.value) setPlace(null);
            }}
            placeholder="Somewhere else? Type it here"
            className="w-full bg-card/60 border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* 3 — When */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono font-black text-muted-foreground uppercase tracking-widest block">
            When
          </span>
          <div className="flex flex-wrap gap-1.5">
            {dateChips.map(chip => (
              <button
                key={chip.label}
                type="button"
                onClick={() => setDate(chip.value)}
                aria-pressed={date === chip.value}
                className={`px-3 py-2 rounded-xl text-[11px] font-sans font-bold border transition ${
                  date === chip.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card/60 text-foreground border-border/60 hover:bg-card"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={date}
              min={isoDate(0)}
              onChange={e => setDate(e.target.value)}
              aria-label="Date"
              className="w-full bg-card/60 border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              aria-label="Time"
              className="w-full bg-card/60 border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* 4 — Optional message */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-black text-muted-foreground uppercase tracking-widest block">
            Message <span className="font-sans lowercase tracking-normal font-normal">(optional)</span>
          </span>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder="Anything she should know?"
            className="w-full bg-card/60 border border-border/60 rounded-xl p-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {error && (
          <p className="text-[11px] text-destructive bg-destructive/10 border border-destructive/25 rounded-xl p-2.5">
            {error}
          </p>
        )}
      </div>

      {/* Summary + send, always visible at the bottom of the panel */}
      <div className="border-t border-border/30 p-4 shrink-0 bg-card/40 space-y-2">
        <p className="text-[11px] text-muted-foreground leading-snug">
          {chosenName ? (
            <>
              <span className="font-bold text-foreground">{planTitle(activity, chosenName)}</span>
              {" · "}
              {prettyDate(date)} at {time}
            </>
          ) : (
            "Pick a place to continue."
          )}
        </p>
        <button
          type="submit"
          disabled={!canSend}
          className="w-full py-2.5 bg-primary text-primary-foreground font-sans text-xs font-black rounded-xl shadow-pop hover:bg-primary/90 transition disabled:opacity-40 disabled:shadow-none"
        >
          {sending ? "Sending…" : "Send invite"}
        </button>
      </div>
    </form>
  );
}
