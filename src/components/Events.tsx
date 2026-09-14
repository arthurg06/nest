import React, { useState } from "react";
import { Event } from "../types";
import { Calendar, Clock, MapPin, Sparkles, Check, Bookmark, X, Trash2, Plus } from "lucide-react";
import { apiUrl } from "../lib/api";

interface MyEventItem {
  kind: "plan" | "outing";
  id: string;
  matchId?: string;
  title: string;
  placeName?: string;
  placeArea?: string;
  date: string;
  time?: string;
  withName?: string;
  location?: string;
  category?: string;
}

interface MemoriesData {
  memories: {
    eventId: string;
    title: string;
    date: string;
    category: string;
    attendeeCount: number;
    photoCount: number;
  }[];
  totals: { photos: number; attendees: number; connections: number };
}

interface EventsProps {
  events: Event[];
  onToggleRsvp: (eventId: string) => void;
  isAdmin: boolean;
  onAddEvent: (title: string, description: string, date: string, time: string, location: string, category: string, price: string, maxParticipants?: number) => void;
  onDeleteEvent?: (id: string) => void;
  /** Opens the chat that owns a confirmed private outing (My Events). */
  onOpenPlanChat?: (matchId: string) => void;
}

export default function Events({ events, onToggleRsvp, isAdmin, onAddEvent, onDeleteEvent, onOpenPlanChat }: EventsProps) {
  const [activeTab, setActiveTab] = React.useState<string>("all");

  // "My Upcoming Events" — the member's own upcoming confirmed plans,
  // scoped to her account by the server; shown in a dedicated modal.
  const [showMyEvents, setShowMyEvents] = useState(false);
  const [myEvents, setMyEvents] = useState<MyEventItem[] | null>(null);
  React.useEffect(() => {
    if (!showMyEvents) return;
    let alive = true;
    fetch(apiUrl("/api/my-events"), {
      headers: { "Authorization": `Bearer ${localStorage.getItem("nest_token")}` }
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive && d) setMyEvents(d.items); })
      .catch(() => {});
    return () => { alive = false; };
  }, [showMyEvents, events]);

  // NEST Memories — the member's personal experience archive, computed
  // server-side from real attendance data.
  const [memoriesData, setMemoriesData] = useState<MemoriesData | null>(null);
  React.useEffect(() => {
    let alive = true;
    fetch(apiUrl("/api/memories"), {
      headers: { "Authorization": `Bearer ${localStorage.getItem("nest_token")}` }
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive && d) setMemoriesData(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [events]);

  // Admin form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newLoc, setNewLoc] = useState("");
  const [newCategory, setNewCategory] = useState("social");
  const [newPrice, setNewPrice] = useState("Free");
  const [newMaxPart, setNewMaxPart] = useState("");

  const categories = [
    { id: "all", label: "All Experiences" },
    { id: "social", label: "Social Mixer" },
    { id: "study", label: "Study & Coffee" },
    { id: "wellness", label: "Wellness & Sports" }
  ];

  const filteredEvents = tabFilter(activeTab);

  function tabFilter(tab: string) {
    if (tab === "all") return events;
    return events.filter(e => e.category === tab);
  }

  const getCategoryImageEmoji = (cat: string) => {
    switch (cat) {
      case "social": return "🍹🧺";
      case "study": return "📚☕";
      case "wellness": return "🧘‍♀️🤸‍♀️";
      default: return "🏛️🌅";
    }
  };

  const handleCreateEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim() || !newDate.trim() || !newTime.trim() || !newLoc.trim()) return;
    onAddEvent(
      newTitle.trim(),
      newDesc.trim(),
      newDate.trim(),
      newTime.trim(),
      newLoc.trim(),
      newCategory,
      newPrice.trim(),
      newMaxPart ? Number(newMaxPart) : undefined
    );
    setNewTitle("");
    setNewDesc("");
    setNewDate("");
    setNewTime("");
    setNewLoc("");
    setNewCategory("social");
    setNewPrice("Free");
    setNewMaxPart("");
    setShowCreateForm(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto relative">
      
      {/* NEST EXPERIENCES — free app, individually priced real-life events.
          No membership, no subscription: you only pay when you book. */}
      <div className="bg-card/50 backdrop-blur-md p-6 rounded-[28px] border border-border/60 shadow-sm space-y-2 animate-fade-in">
        <span className="font-mono text-[10px] font-black tracking-widest text-primary uppercase">NEST Experiences</span>
        <h2 className="font-display text-3xl text-foreground leading-tight">
          Meet your people IRL.
        </h2>
        <p className="font-sans text-xs text-muted-foreground leading-relaxed max-w-md">
          From dinners and nights out to wellness, creative experiences and spontaneous
          plans — NEST Experiences are designed to take your friendships offline.
        </p>
        <p className="font-sans text-[11px] font-bold text-foreground">
          NEST is free. You only pay for the experiences you choose to book.
        </p>
      </div>

      {/* Section header + admin publishing */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h3 className="font-display text-2xl text-foreground">
            Upcoming experiences
          </h3>
          <p className="font-sans text-xs text-muted-foreground mt-1">
            Curated by NEST. Each experience has its own price — many are free.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreateForm(prev => !prev)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-sans text-xs font-black px-4 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Plus size={14} />
            <span>Publish experience</span>
          </button>
        )}
      </div>

      {/* Admin Event Creation Panel Form */}
      {isAdmin && showCreateForm && (
        <form onSubmit={handleCreateEventSubmit} className="bg-card/50 backdrop-blur-md p-6 rounded-[28px] border border-border/70 shadow-xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
            <h3 className="font-sans font-black text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={16} className="text-primary" />
              <span>Admin: Publish NEST Experience</span>
            </h3>
            <button type="button" onClick={() => setShowCreateForm(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground p-2 -m-2 rounded-lg">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Experience Title</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Sunday Morning Picnic at Retiro"
                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
              >
                <option value="social">🍹 Picnic & Social Mixer</option>
                <option value="study">☕ Study Session & Coffee</option>
                <option value="wellness">🧘‍♀️ Yoga & Sports Wellness</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Experience Description</label>
            <textarea
              required
              rows={2}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Provide a warm description of the experience, meeting spots, etc."
              className="w-full bg-card border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Date</label>
              <input
                type="text"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                placeholder="e.g. Tuesday, Oct 15"
                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Time</label>
              <input
                type="text"
                required
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                placeholder="e.g. 18:00 - 20:00"
                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Location / Venue Address</label>
              <input
                type="text"
                required
                value={newLoc}
                onChange={(e) => setNewLoc(e.target.value)}
                placeholder="e.g. Retiro Lake Steps"
                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Price/Entry Cost</label>
              <input
                type="text"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="e.g. Free or €38"
                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Max Attending Limit (Optional)</label>
              <input
                type="number"
                value={newMaxPart}
                onChange={(e) => setNewMaxPart(e.target.value)}
                placeholder="Unlimited"
                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 border border-border text-muted-foreground rounded-xl text-xs font-bold hover:bg-muted/60"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold shadow-md shadow-rose-200/50"
            >
              Publish Experience
            </button>
          </div>
        </form>
      )}

      {/* MY UPCOMING EVENTS — a personal shortcut, deliberately styled
          apart from the category tabs below it. */}
      <button
        type="button"
        onClick={() => setShowMyEvents(true)}
        className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-rose-300 font-sans text-xs font-black px-5 py-3 rounded-2xl transition shadow-pop flex items-center justify-center gap-2 cursor-pointer"
      >
        <span className="text-sm select-none">🪺</span>
        <span>My Upcoming Events</span>
      </button>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 select-none border-b border-border/30">
        {categories.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 font-sans text-xs font-bold transition-all relative ${
              activeTab === tab.id
                ? "text-primary"
                : "text-muted-foreground hover:text-rose-400"
            }`}
          >
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Experiences grid */}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredEvents.map(event => (
            <div
              key={event.id}
              id={`event-card-${event.id}`}
              className="bg-card/40 backdrop-blur-md rounded-[28px] border border-border/60 overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-xl hover:bg-card/50 transition-all duration-300 animate-fade-in"
            >
              <div>
                {/* Event Cover Image Simulation */}
                <div className="h-32 bg-card/20 flex items-center justify-center relative p-4 text-center overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-tr ${
                    event.category === "social" 
                      ? "from-rose-200 to-amber-100" 
                      : event.category === "study" 
                      ? "from-indigo-100 to-sky-100" 
                      : "from-emerald-100 to-teal-50"
                  } opacity-50`} />

                  <div className="z-10 text-center">
                    <span className="text-3xl block mb-1.5 select-none">{getCategoryImageEmoji(event.category)}</span>
                    <span className="bg-card/50 backdrop-blur-md border border-border/40 text-foreground text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full font-mono tracking-widest">
                      {event.category}
                    </span>
                  </div>

                  <span className="absolute top-3 right-3 bg-card/80 backdrop-blur-md border border-border/50 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {event.price}
                  </span>
                </div>

                <div className="p-5 space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-sans font-black text-foreground text-base leading-snug">
                      {event.title}
                    </h3>
                    <p className="font-sans text-[10px] text-muted-foreground">
                      Organized by: <span className="font-semibold text-muted-foreground">{event.organizer}</span>
                    </p>
                  </div>

                  <p className="font-sans text-xs text-muted-foreground leading-relaxed select-text">
                    {event.description}
                  </p>

                  <div className="space-y-1.5 text-xs text-muted-foreground font-sans pt-1">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-primary shrink-0" />
                      <span>{event.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-primary shrink-0" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-primary shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  </div>

                  {/* Price transparency — rendered only when the experience
                      declares what its price does (and does not) cover. */}
                  {(event.includes?.length || event.notIncluded?.length) ? (
                    <div className="bg-muted/40 border border-border/40 rounded-xl p-3 space-y-1.5">
                      {event.includes && event.includes.length > 0 && (
                        <div>
                          <span className="text-[9px] font-mono font-black uppercase tracking-widest text-muted-foreground block mb-1">Includes</span>
                          <ul className="space-y-0.5">
                            {event.includes.map(item => (
                              <li key={item} className="flex items-start gap-1.5 text-[11px] text-muted-foreground font-sans">
                                <Check size={11} className="text-success shrink-0 mt-0.5" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {event.notIncluded && event.notIncluded.length > 0 && (
                        <div>
                          <span className="text-[9px] font-mono font-black uppercase tracking-widest text-muted-foreground block mb-1">Not included</span>
                          <ul className="space-y-0.5">
                            {event.notIncluded.map(item => (
                              <li key={item} className="flex items-start gap-1.5 text-[11px] text-muted-foreground font-sans">
                                <X size={11} className="text-muted-foreground shrink-0 mt-0.5" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Footer RSVP Action Row */}
              <div className="px-5 py-3.5 bg-card/30 border-t border-border/20 flex items-center justify-between select-none">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-muted-foreground font-bold">
                    {event.rsvpsCount}{event.maxParticipants ? ` / ${event.maxParticipants}` : ""} attending
                  </span>
                  {event.maxParticipants && (
                    <span className="text-[9px] font-sans text-primary font-bold leading-none mt-0.5 uppercase tracking-wider">
                      Max Capacity Limit
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && onDeleteEvent && (
                    <button
                      onClick={() => onDeleteEvent(event.id)}
                      className="p-2.5 bg-accent/30 hover:bg-accent/60 text-primary rounded-xl transition"
                      title="Delete Outing (Admin only)"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}

                  {(() => {
                    const isFull = event.maxParticipants && event.rsvpsCount >= event.maxParticipants;
                    return (
                      <button
                        disabled={isFull && !event.userRsvped}
                        onClick={() => onToggleRsvp(event.id)}
                        className={`px-4 py-2 rounded-xl font-sans text-xs font-bold shadow-md transition-all flex items-center gap-1 active:scale-95 ${
                          event.userRsvped
                            ? "bg-slate-950 text-rose-400 border border-slate-800 hover:bg-slate-900"
                            : isFull
                            ? "bg-muted text-muted-foreground border border-border cursor-not-allowed shadow-none"
                            : "bg-primary text-primary-foreground shadow-rose-200/50 hover:bg-primary/90"
                        }`}
                      >
                        {event.userRsvped ? (
                          <>
                            <Check size={12} strokeWidth={3} />
                            <span>Attending</span>
                          </>
                        ) : isFull ? (
                          <span>Fully booked</span>
                        ) : (
                          <>
                            <Bookmark size={12} />
                            <span>Book your spot</span>
                          </>
                        )}
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Coming soon — the honest state while no experience is scheduled.
           No fake cards, dates, prices, or availability. */
        <div className="bg-card/40 backdrop-blur-xl rounded-[28px] border border-border p-8 text-center max-w-md mx-auto space-y-4 py-12 animate-fade-in">
          <span className="text-4xl select-none block">🪺✨</span>
          <h3 className="font-display text-xl text-foreground">Coming soon.</h3>
          <p className="font-sans text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
            We're currently putting together the first NEST experiences in Madrid.
            They'll appear right here — you'll be the first to know.
          </p>
        </div>
      )}

      {/* NEST MEMORIES — the member's personal archive of attended
          experiences. Every number comes from the server's real records. */}
      {memoriesData && (
        <div className="bg-card/40 backdrop-blur-md rounded-[28px] border border-border/60 p-6 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 border-b border-border/30 pb-3">
            <span className="text-lg select-none">🪺</span>
            <div>
              <h3 className="font-display text-xl text-foreground leading-none">NEST Memories</h3>
              <p className="font-sans text-[11px] text-muted-foreground mt-1">
                Your personal archive of the NEST experiences you've been part of.
              </p>
            </div>
          </div>

          {memoriesData && memoriesData.memories.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2">
                <span className="bg-accent/40 border border-border/50 text-foreground font-sans text-[11px] font-bold px-3 py-1.5 rounded-full">
                  📸 {memoriesData.totals.photos} photos
                </span>
                <span className="bg-accent/40 border border-border/50 text-foreground font-sans text-[11px] font-bold px-3 py-1.5 rounded-full">
                  👯‍♀️ {memoriesData.totals.attendees} girls attended
                </span>
                <span className="bg-accent/40 border border-border/50 text-foreground font-sans text-[11px] font-bold px-3 py-1.5 rounded-full">
                  💞 {memoriesData.totals.connections} new connections
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {memoriesData.memories.map(memory => (
                  <div key={memory.eventId} className="bg-card/60 border border-border/50 rounded-2xl p-3.5 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-sans font-bold text-xs text-foreground leading-snug">{memory.title}</h4>
                      <span className="text-base select-none shrink-0">{getCategoryImageEmoji(memory.category)}</span>
                    </div>
                    <p className="font-sans text-[10px] text-muted-foreground">{memory.date}</p>
                    <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                      {memory.attendeeCount} attended · {memory.photoCount} photos
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-6 space-y-1">
              <p className="font-sans text-xs text-muted-foreground">Your NEST Memories will live here.</p>
              <p className="font-sans text-xs font-bold text-foreground">Your first one is waiting. 🪺</p>
            </div>
          )}
        </div>
      )}

      {/* MY UPCOMING EVENTS modal — mobile-first sheet listing only the
          member's own confirmed upcoming plans (server-scoped). */}
      {showMyEvents && (
        <div
          className="fixed inset-0 z-[75] bg-slate-950/60 backdrop-blur-sm flex items-end md:items-center justify-center animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="My Upcoming Events"
        >
          <div className="bg-card w-full md:max-w-md max-h-[85vh] rounded-t-[32px] md:rounded-[32px] border-t md:border border-border/70 shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between gap-3 shrink-0">
              <h3 className="font-sans font-black text-base text-foreground">My Upcoming Events</h3>
              <button
                type="button"
                onClick={() => setShowMyEvents(false)}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground p-2 -m-2 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {myEvents === null ? (
                <p className="text-xs text-muted-foreground font-sans italic py-4 text-center">Loading…</p>
              ) : myEvents.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <span className="text-4xl block select-none">🪺</span>
                  <p className="font-sans text-sm font-bold text-foreground">You don't have any upcoming events yet 🪺</p>
                  <p className="font-sans text-xs text-muted-foreground leading-relaxed max-w-[240px] mx-auto">
                    Explore the outings curated by the NEST team, or plan one with a match from your chats.
                  </p>
                </div>
              ) : (
                myEvents.map(item => (
                  <button
                    key={item.kind + item.id}
                    type="button"
                    onClick={() => {
                      setShowMyEvents(false);
                      if (item.kind === "plan" && item.matchId) {
                        onOpenPlanChat?.(item.matchId);
                      } else {
                        setActiveTab("all");
                        window.setTimeout(() => {
                          document.getElementById(`event-card-${item.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }, 200);
                      }
                    }}
                    className="w-full text-left bg-card/60 rounded-2xl border border-border/60 p-4 flex items-center gap-3.5 shadow-sm hover:bg-muted/40 hover:shadow-md transition animate-fade-in cursor-pointer"
                  >
                    <span className="text-2xl select-none shrink-0">
                      {item.kind === "plan" ? "💌" : getCategoryImageEmoji(item.category || "")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-sans font-bold text-sm text-foreground leading-snug truncate">{item.title}</h4>
                      <p className="font-sans text-[11px] text-muted-foreground mt-0.5 truncate">
                        {item.kind === "plan"
                          ? `${new Date(`${item.date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} at ${item.time} · ${item.placeName} · with ${item.withName}`
                          : [item.date, item.time, item.location].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className="text-[9px] font-mono font-black uppercase tracking-widest text-primary shrink-0">
                      {item.kind === "plan" ? "Outing" : "NEST event"}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
