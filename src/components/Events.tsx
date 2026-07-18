import React, { useState } from "react";
import { Event } from "../types";
import { Calendar, Clock, MapPin, Sparkles, Check, Bookmark, Crown, X, Trash2, Plus } from "lucide-react";

interface EventsProps {
  events: Event[];
  onToggleRsvp: (eventId: string) => void;
  isSubscribed: boolean;
  onSyncOfficialEvents?: () => void;
  isAdmin: boolean;
  onAddEvent: (title: string, description: string, date: string, time: string, location: string, category: string, price: string, maxParticipants?: number) => void;
  onDeleteEvent?: (id: string) => void;
}

export default function Events({ events, onToggleRsvp, isSubscribed, onSyncOfficialEvents, isAdmin, onAddEvent, onDeleteEvent }: EventsProps) {
  const [activeTab, setActiveTab] = React.useState<string>("all");
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

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
    { id: "all", label: "All Events" },
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

  const handleRsvpClick = (eventId: string) => {
    if (!isSubscribed) {
      setShowSubscriptionModal(true);
    } else {
      onToggleRsvp(eventId);
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
      
      {/* Premium Subscription Banner Indicator */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm ${
        isSubscribed 
          ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 text-amber-800" 
          : "bg-slate-50 border-stone-200 text-slate-700"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isSubscribed ? "bg-amber-500 text-white" : "bg-stone-200 text-stone-500"
          }`}>
            <Crown size={20} className={isSubscribed ? "animate-bounce" : ""} />
          </div>
          <div>
            <h4 className="font-sans font-black text-xs uppercase tracking-wider">
              {isSubscribed ? "NEST Premium Membership Active 👑" : "NEST Basic Student Account"}
            </h4>
            <p className="font-sans text-[11px] text-slate-500 leading-tight mt-0.5">
              {isSubscribed 
                ? "You have full access to RSVP and join all student gatherings, mixers, and trips! Enjoy Madrid! xx" 
                : "Browse student gatherings around Madrid. Upgrade to join outings & RSVP."
              }
            </p>
          </div>
        </div>

        {!isSubscribed && (
          <button
            onClick={() => setShowSubscriptionModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-700 font-sans text-xs font-bold px-4 py-2 rounded-xl transition"
          >
            About NEST Premium
          </button>
        )}
      </div>

      {/* Header text with Host Gathering Button removed, official badges only */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h2 className="font-sans font-black text-2xl text-slate-900 tracking-tight">
            Official NEST Outings 🗓️✨
          </h2>
          <p className="font-sans text-xs text-slate-500 mt-1">
            All outings are 100% curated and hosted by NEST Staff. Only active subscription accounts can RSVP/Join.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <button
              onClick={() => setShowCreateForm(prev => !prev)}
              className="bg-rose-500 hover:bg-rose-600 text-white font-sans text-xs font-black px-4 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer"
            >
              <Plus size={14} />
              <span>Publish Curated Outing</span>
            </button>
          )}
          <div className="bg-slate-950 text-amber-400 font-mono text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-slate-800 shadow-sm shrink-0">
            ✨ Official NEST Curation only
          </div>
        </div>
      </div>

      {/* Admin Event Creation Panel Form */}
      {isAdmin && showCreateForm && (
        <form onSubmit={handleCreateEventSubmit} className="bg-white/50 backdrop-blur-md p-6 rounded-[28px] border border-rose-100 shadow-xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-rose-100 pb-2.5">
            <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={16} className="text-rose-500" />
              <span>Admin: Publish Curated Outing</span>
            </h3>
            <button type="button" onClick={() => setShowCreateForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Outing Title</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Sunday Morning Picnic at Retiro"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
              >
                <option value="social">🍹 Picnic & Social Mixer</option>
                <option value="study">☕ Study Session & Coffee</option>
                <option value="wellness">🧘‍♀️ Yoga & Sports Wellness</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Outing Description</label>
            <textarea
              required
              rows={2}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Provide a warm description of the outing, meetups spots, etc."
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Date</label>
              <input
                type="text"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                placeholder="e.g. Tuesday, Oct 15"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Time</label>
              <input
                type="text"
                required
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                placeholder="e.g. 18:00 - 20:00"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Location / Venue Address</label>
              <input
                type="text"
                required
                value={newLoc}
                onChange={(e) => setNewLoc(e.target.value)}
                placeholder="e.g. Retiro Lake Steps"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Price/Entry Cost</label>
              <input
                type="text"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="e.g. Free or €5"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Max Attending Limit (Optional)</label>
              <input
                type="number"
                value={newMaxPart}
                onChange={(e) => setNewMaxPart(e.target.value)}
                placeholder="Unlimited"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-200/50"
            >
              Publish Outing
            </button>
          </div>
        </form>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 select-none border-b border-white/30">
        {categories.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 font-sans text-xs font-bold transition-all relative ${
              activeTab === tab.id
                ? "text-rose-600"
                : "text-slate-500 hover:text-rose-400"
            }`}
          >
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-rose-500" />
            )}
          </button>
        ))}
      </div>

      {/* Events Grid layout */}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredEvents.map(event => (
            <div
              key={event.id}
              id={`event-card-${event.id}`}
              className="bg-white/40 backdrop-blur-md rounded-[28px] border border-white/60 overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-xl hover:bg-white/50 transition-all duration-300 animate-fade-in"
            >
              <div>
                {/* Event Cover Image Simulation */}
                <div className="h-32 bg-white/20 flex items-center justify-center relative p-4 text-center overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-tr ${
                    event.category === "social" 
                      ? "from-rose-200 to-amber-100" 
                      : event.category === "study" 
                      ? "from-indigo-100 to-sky-100" 
                      : "from-emerald-100 to-teal-50"
                  } opacity-50`} />

                  <div className="absolute inset-0 opacity-[0.03] select-none text-[8px] font-mono break-all leading-none p-1 pointer-events-none">
                    NESTSTUDENTNET_NESTSPAIN_MADRID_STUDENT_NEST_FEMALE_SUPPORT_NEST_INTERNATIONAL_GIRLS
                  </div>

                  <div className="z-10 text-center">
                    <span className="text-3xl block mb-1.5 select-none">{getCategoryImageEmoji(event.category)}</span>
                    <span className="bg-white/50 backdrop-blur-md border border-white/40 text-slate-800 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full font-mono tracking-widest">
                      {event.category}
                    </span>
                  </div>

                  <span className="absolute top-3 right-3 bg-white/80 backdrop-blur-md border border-white/50 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {event.price}
                  </span>
                </div>

                <div className="p-5 space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-sans font-black text-slate-900 text-base leading-snug">
                      {event.title}
                    </h3>
                    <p className="font-sans text-[10px] text-slate-400">
                      Organized by: <span className="font-semibold text-slate-600">{event.organizer}</span>
                    </p>
                  </div>

                  <p className="font-sans text-xs text-slate-600 leading-relaxed select-text">
                    {event.description}
                  </p>

                  <div className="space-y-1.5 text-xs text-slate-500 font-sans pt-1">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-rose-500 shrink-0" />
                      <span>{event.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-rose-500 shrink-0" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-rose-500 shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer RSVP Action Row */}
              <div className="px-5 py-3.5 bg-white/30 border-t border-white/20 flex items-center justify-between select-none">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-slate-600 font-bold">
                    👤 {event.rsvpsCount}{event.maxParticipants ? ` / ${event.maxParticipants}` : ""} Girls attending
                  </span>
                  {event.maxParticipants && (
                    <span className="text-[9px] font-sans text-rose-500 font-bold leading-none mt-0.5 uppercase tracking-wider">
                      Max Capacity Limit
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && onDeleteEvent && (
                    <button
                      onClick={() => onDeleteEvent(event.id)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition"
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
                        onClick={() => handleRsvpClick(event.id)}
                        className={`px-4 py-2 rounded-xl font-sans text-xs font-bold shadow-md transition-all flex items-center gap-1 active:scale-95 ${
                          event.userRsvped
                            ? "bg-slate-950 text-rose-400 border border-slate-800 hover:bg-slate-900"
                            : isFull
                            ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                            : "bg-rose-500 text-white shadow-rose-200/50 hover:bg-rose-600"
                        }`}
                      >
                        {event.userRsvped ? (
                          <>
                            <Check size={12} strokeWidth={3} />
                            <span>Attending</span>
                          </>
                        ) : isFull ? (
                          <span>Event Full</span>
                        ) : (
                          <>
                            <Bookmark size={12} />
                            <span>RSVP Now</span>
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
        <div className="bg-white/40 backdrop-blur-xl rounded-[28px] border border-stone-200 p-8 text-center max-w-md mx-auto space-y-4 py-12 animate-fade-in">
          <span className="text-4xl select-none block">🗓️✨</span>
          <h3 className="font-sans font-black text-stone-800 text-base">No active outings listed yet</h3>
          <p className="font-sans text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            NEST is a strictly curated, safe platform. All listings are curated and published by the official NEST Board.
          </p>
          {onSyncOfficialEvents && (
            <button
              onClick={onSyncOfficialEvents}
              className="bg-rose-500 hover:bg-rose-600 text-white font-sans text-xs font-black px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer mt-2"
            >
              Sync NEST Curated Outings
            </button>
          )}
        </div>
      )}

      {/* GORGEOUS PREMIUM SUBSCRIPTION FORM MODAL */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-text">
          <div className="bg-white rounded-[32px] border border-stone-200 max-w-md w-full overflow-hidden shadow-2xl relative animate-scale-up">
            
            {/* Close Button */}
            <button
              onClick={() => setShowSubscriptionModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition z-10"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="bg-slate-950 text-white p-6 pb-8 text-center relative overflow-hidden">
              <Crown className="w-12 h-12 text-amber-400 mx-auto mb-2" />
              <h3 className="font-sans font-black text-xl tracking-tight">NEST Premium</h3>
              <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase mt-1">Unlock official outings</p>
            </div>

            {/* Membership status — payments are not live yet */}
            <div className="p-6 space-y-5">
              <div className="bg-rose-50/50 border border-rose-100/50 p-4 rounded-2xl text-slate-600 space-y-1 text-xs">
                <p className="font-semibold text-slate-800">What Premium includes</p>
                <p className="text-slate-500 leading-normal">
                  RSVP access to all official NEST outings — mixers, picnics, study sessions, and wellness meetups curated by the NEST team.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-800 leading-normal">
                <p className="font-bold mb-0.5">Premium payments are being configured</p>
                <p>
                  Secure checkout is not available yet. Membership will open soon — no payment details are collected in the meantime.
                </p>
              </div>

              <button
                onClick={() => setShowSubscriptionModal(false)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-sans text-xs font-bold py-3 rounded-2xl transition shadow-md"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
