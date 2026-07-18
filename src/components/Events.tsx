import React, { useState } from "react";
import { Event } from "../types";
import { Calendar, Clock, MapPin, Sparkles, Check, Bookmark, Crown, X, Trash2, Plus } from "lucide-react";
import { PREMIUM_PRICE_LABEL, PREMIUM_RENEWAL_NOTE } from "../../shared/subscription";
import { apiUrl } from "../lib/api";

export interface SubscriptionInfo {
  stripeConfigured: boolean;
  premium: boolean;
  subscriptionStatus: string | null;
  hasStripeCustomer: boolean;
  plan: { name: string; priceCents: number; currency: string; interval: string; label: string };
}

interface EventsProps {
  events: Event[];
  onToggleRsvp: (eventId: string) => void;
  isSubscribed: boolean;
  subscription: SubscriptionInfo | null;
  onSyncOfficialEvents?: () => void;
  isAdmin: boolean;
  onAddEvent: (title: string, description: string, date: string, time: string, location: string, category: string, price: string, maxParticipants?: number) => void;
  onDeleteEvent?: (id: string) => void;
}

export default function Events({ events, onToggleRsvp, isSubscribed, subscription, onSyncOfficialEvents, isAdmin, onAddEvent, onDeleteEvent }: EventsProps) {
  const [activeTab, setActiveTab] = React.useState<string>("all");
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const stripeReady = subscription?.stripeConfigured === true;
  const priceLabel = subscription?.plan?.label || PREMIUM_PRICE_LABEL;

  // Stripe-hosted checkout: the browser is redirected to Stripe; no card
  // data is ever collected in this app.
  const handleStartCheckout = async () => {
    setPaymentError("");
    setIsRedirecting(true);
    try {
      const res = await fetch(apiUrl("/api/subscription/checkout"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("nest_token")}`
        }
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Checkout is unavailable right now.");
      }
      window.location.href = data.url;
    } catch (err: any) {
      setPaymentError(err.message || "Checkout is unavailable right now.");
      setIsRedirecting(false);
    }
  };

  const handleOpenPortal = async () => {
    setPaymentError("");
    try {
      const res = await fetch(apiUrl("/api/subscription/portal"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("nest_token")}`
        }
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "The billing portal is unavailable right now.");
      }
      window.location.href = data.url;
    } catch (err: any) {
      setPaymentError(err.message || "The billing portal is unavailable right now.");
    }
  };

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
          : "bg-card border-border text-foreground"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isSubscribed ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"
          }`}>
            <Crown size={20} className={isSubscribed ? "animate-bounce" : ""} />
          </div>
          <div>
            <h4 className="font-sans font-black text-xs uppercase tracking-wider">
              {isSubscribed ? "NEST Premium Membership Active 👑" : "NEST Basic Student Account"}
            </h4>
            <p className="font-sans text-[11px] text-muted-foreground leading-tight mt-0.5">
              {isSubscribed
                ? "Full access to every official NEST outing. Enjoy Madrid!"
                : "Browse outings freely. Membership unlocks RSVPs."
              }
            </p>
          </div>
        </div>

        {isSubscribed ? (
          subscription?.hasStripeCustomer && (
            <button
              onClick={handleOpenPortal}
              className="bg-card hover:bg-card text-foreground border border-border font-sans text-xs font-bold px-4 py-2 rounded-xl transition"
            >
              Manage subscription
            </button>
          )
        ) : (
          <button
            onClick={() => setShowSubscriptionModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-rose-300 border border-slate-700 font-sans text-xs font-bold px-4 py-2 rounded-xl transition shadow-pop"
          >
            Join NEST Premium · {priceLabel}
          </button>
        )}
      </div>

      {/* Header text with Host Gathering Button removed, official badges only */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h2 className="font-display text-3xl text-foreground">
            Official outings
          </h2>
          <p className="font-sans text-xs text-muted-foreground mt-1">
            Curated by the NEST team. Membership unlocks RSVPs.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreateForm(prev => !prev)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-sans text-xs font-black px-4 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Plus size={14} />
            <span>Publish outing</span>
          </button>
        )}
      </div>

      {/* Admin Event Creation Panel Form */}
      {isAdmin && showCreateForm && (
        <form onSubmit={handleCreateEventSubmit} className="bg-card/50 backdrop-blur-md p-6 rounded-[28px] border border-border/70 shadow-xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
            <h3 className="font-sans font-black text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={16} className="text-primary" />
              <span>Admin: Publish Curated Outing</span>
            </h3>
            <button type="button" onClick={() => setShowCreateForm(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground p-2 -m-2 rounded-lg">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Outing Title</label>
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
            <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Outing Description</label>
            <textarea
              required
              rows={2}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Provide a warm description of the outing, meetups spots, etc."
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
                placeholder="e.g. Free or €5"
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
              Publish Outing
            </button>
          </div>
        </form>
      )}

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

      {/* Events Grid layout */}
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
                        onClick={() => handleRsvpClick(event.id)}
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
        <div className="bg-card/40 backdrop-blur-xl rounded-[28px] border border-border p-8 text-center max-w-md mx-auto space-y-4 py-12 animate-fade-in">
          <span className="text-4xl select-none block">🗓️</span>
          <h3 className="font-display text-lg text-foreground">No outings scheduled yet</h3>
          <p className="font-sans text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
            New outings from the NEST team will appear here.
          </p>
          {onSyncOfficialEvents && (
            <button
              onClick={onSyncOfficialEvents}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-sans text-xs font-black px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer mt-2"
            >
              Sync NEST Curated Outings
            </button>
          )}
        </div>
      )}

      {/* GORGEOUS PREMIUM SUBSCRIPTION FORM MODAL */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-text">
          <div className="bg-card rounded-[32px] border border-border max-w-md w-full overflow-hidden shadow-2xl relative animate-scale-up">
            
            {/* Close Button */}
            <button
              onClick={() => setShowSubscriptionModal(false)}
              aria-label="Close" className="absolute top-3 right-3 text-muted-foreground hover:text-foreground p-2.5 rounded-full hover:bg-muted transition z-10"
            >
              <X size={18} />
            </button>

            {/* Brand header */}
            <div className="bg-slate-950 text-white p-6 pb-7 text-center relative overflow-hidden">
              <img
                src="/icons/nest-192.png"
                alt="NEST logo"
                className="w-14 h-14 rounded-2xl mx-auto mb-3 shadow-lg border border-border/10"
              />
              <h3 className="font-sans font-black text-xl tracking-tight">{subscription?.plan?.name || "NEST Premium"}</h3>
              <div className="text-rose-300 font-sans font-black text-sm mt-1">{priceLabel}</div>
              <p className="text-[10px] text-muted-foreground mt-1">{PREMIUM_RENEWAL_NOTE}</p>
            </div>

            <div className="p-6 space-y-4">
              <ul className="text-xs text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>RSVP to every official NEST outing — mixers, picnics, study sessions, wellness meetups</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>Curated, women-only gatherings hosted by the NEST team</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>Cancel anytime from the billing portal</span>
                </li>
              </ul>

              {paymentError && (
                <div className="bg-destructive/10 border border-destructive/25 text-destructive p-3 rounded-xl text-[11px] leading-normal">
                  {paymentError}
                </div>
              )}

              {stripeReady ? (
                <>
                  <button
                    onClick={handleStartCheckout}
                    disabled={isRedirecting}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-sans text-xs font-bold py-3 rounded-2xl transition shadow-pop disabled:opacity-60 disabled:shadow-none"
                  >
                    {isRedirecting ? "Opening secure checkout…" : "Continue to secure checkout"}
                  </button>
                  <p className="text-[10px] text-muted-foreground text-center leading-normal">
                    Payment is handled by Stripe on a secure page — card details never touch NEST. Major cards and Apple Pay are supported where available.
                  </p>
                </>
              ) : (
                <>
                  <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-[11px] text-amber-800 leading-normal">
                    <p className="font-bold mb-0.5">Payments are being configured</p>
                    <p>Secure checkout opens soon. No payment details are collected in the meantime.</p>
                    {import.meta.env.DEV && (
                      <p className="mt-1.5 font-mono text-[10px] text-amber-600">
                        Dev notice: Stripe environment variables are not set.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowSubscriptionModal(false)}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-sans text-xs font-bold py-3 rounded-2xl transition shadow-md"
                  >
                    Got it
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
