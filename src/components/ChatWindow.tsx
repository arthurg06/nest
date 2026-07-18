import React, { useState, useEffect, useRef } from "react";
import { Match, Message, UserProfile, MapSpot, Plan } from "../types";
import { MADRID_MAP_SPOTS } from "../data";
import Map from "./Map";
import { Send, MapPin, Calendar, Clock, Smile, Sparkles, AlertCircle, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { isOwnMessage } from "../lib/chat";
import VerifiedBadge from "./VerifiedBadge";

interface ChatWindowProps {
  activeMatch: Match;
  currentUser: UserProfile;
  currentUserId: string;
  onSendMessage: (matchId: string, text: string, planId?: string) => void;
  onRespondToPlan: (matchId: string, planId: string, status: "accepted" | "declined") => void;
  onSuggestPlan: (matchId: string, plan: Omit<Plan, "id" | "status" | "senderId" | "receiverId">) => void;
  plans: Plan[];
}

export default function ChatWindow({
  activeMatch,
  currentUser,
  currentUserId,
  onSendMessage,
  onRespondToPlan,
  onSuggestPlan,
  plans
}: ChatWindowProps) {
  const [inputText, setInputText] = useState("");
  const [showScheduler, setShowScheduler] = useState(false);
  
  // Scheduling state
  const [planTitle, setPlanTitle] = useState("");
  const [planDate, setPlanDate] = useState("2026-07-24");
  const [planTime, setPlanTime] = useState("16:00");
  const [selectedSpot, setSelectedSpot] = useState<MapSpot | null>(null);
  const [planNotes, setPlanNotes] = useState("");
  const [schedulerError, setSchedulerError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMatch.messages]);

  // Send a message. Messages only ever come from real users — the other
  // participant replies herself when she is online.
  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(activeMatch.id, inputText.trim());
    setInputText("");
  };

  // Find shared interests with the match
  const getSharedInterests = () => {
    const act = currentUser.interests.activities.filter(a => activeMatch.profile.interests.activities.includes(a));
    const mus = currentUser.interests.music.filter(m => activeMatch.profile.interests.music.includes(m));
    const soc = currentUser.interests.social.filter(s => activeMatch.profile.interests.social.includes(s));
    return [...act, ...mus, ...soc];
  };

  const sharedInterests = getSharedInterests();

  // Find map locations matching shared interests!
  const getSuggestedSpots = () => {
    return MADRID_MAP_SPOTS.filter(spot => {
      // Spot matches if any of its bestFor interest tags are in sharedInterests
      return spot.bestFor.some(tag => sharedInterests.includes(tag));
    });
  };

  const suggestedSpots = getSuggestedSpots();

  // Auto-fill scheduler fields based on spot selection
  const handleSelectSpot = (spot: MapSpot) => {
    setSelectedSpot(spot);
    // Autofill an elegant title
    let title = `Meetup at ${spot.name}`;
    if (spot.category === "cafe") title = `Café date @ ${spot.name} ☕`;
    else if (spot.category === "study") title = `Study session @ ${spot.name} 📚`;
    else if (spot.category === "activity") title = `Pilates/Outdoors @ ${spot.name} 🌳`;
    else if (spot.category === "hidden_gem") title = `Exploring ${spot.name} ✨`;
    setPlanTitle(title);
    setSchedulerError("");
  };

  // Handle scheduling submission
  const handleScheduleOuting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpot) {
      setSchedulerError("Please select a location on the map first!");
      return;
    }
    if (!planTitle.trim()) {
      setSchedulerError("Please enter a title for the outing!");
      return;
    }

    // Trigger suggestion callback
    onSuggestPlan(activeMatch.id, {
      title: planTitle.trim(),
      date: planDate,
      time: planTime,
      locationName: selectedSpot.name,
      locationAddress: selectedSpot.address,
      notes: planNotes.trim() || undefined
    });

    // Reset and close scheduler
    setShowScheduler(false);
    setSelectedSpot(null);
    setPlanTitle("");
    setPlanNotes("");
    setSchedulerError("");
  };

  return (
    <div className="flex flex-col h-full bg-card/40 backdrop-blur-xl rounded-[28px] border border-border/60 shadow-2xl overflow-hidden relative">
      {/* Chat Window Header */}
      <div className="px-5 py-3.5 border-b border-border/30 flex items-center justify-between bg-card/30 shrink-0">
        <div className="flex items-center gap-3">
          {/* Avatar Icon */}
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${activeMatch.profile.avatarColor} flex items-center justify-center text-white font-extrabold shadow-sm`}>
            {activeMatch.profile.name[0]}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-sans font-bold text-sm text-foreground leading-none">
                {activeMatch.profile.name}
              </h4>
              <VerifiedBadge profile={activeMatch.profile} />
            </div>
            <p className="text-[10px] text-muted-foreground font-mono leading-tight mt-0.5">
              {activeMatch.profile.university} • {activeMatch.profile.nationality}
            </p>
          </div>
        </div>

        {/* Action button to open scheduler */}
        <button
          onClick={() => {
            setShowScheduler(!showScheduler);
            // Pre-select first suggested spot if available
            if (suggestedSpots.length > 0 && !selectedSpot) {
              handleSelectSpot(suggestedSpots[0]);
            }
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-sans text-xs font-bold transition-all border ${
            showScheduler 
              ? "bg-primary text-primary-foreground border-rose-400 shadow-md shadow-rose-200/45" 
              : "bg-card/60 text-primary border-border/70 hover:bg-card/80 shadow-sm"
          }`}
        >
          <Calendar size={13} />
          <span>{showScheduler ? "Hide Planning Tool" : "Plan an Outing"}</span>
        </button>
      </div>

      {/* Main Container - Left Chat, Right Scheduler (if open) */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* TEXT LOG */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden bg-card/10 backdrop-blur-sm">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            
            {/* Compatibility info card at start of logs */}
            <div className="bg-accent/70 backdrop-blur-md rounded-2xl p-4 border border-border/50 max-w-sm mx-auto text-center space-y-1 shadow-sm">
              <h5 className="font-sans font-bold text-xs text-primary">
                {activeMatch.compatibilityRating}% compatibility
              </h5>
              {sharedInterests.length > 0 && (
                <p className="font-sans text-[11px] text-muted-foreground">
                  You both love{" "}
                  <span className="font-semibold text-foreground">
                    {sharedInterests.slice(0, 3).join(", ")}
                  </span>
                </p>
              )}
            </div>

            {/* Individual messages mapping */}
            {activeMatch.messages.map((msg) => {
              const isMe = isOwnMessage(msg.senderId, currentUserId);

              // Check if message references a scheduled plan invitation
              const linkedPlan = msg.planId ? plans.find(p => p.id === msg.planId) : null;

              return (
                <div
                  key={msg.id}
                  id={`chat-msg-${msg.id}`}
                  role="group"
                  aria-label={`Message from ${isMe ? "you" : activeMatch.profile.name}`}
                  className={`flex ${isMe ? "justify-end" : "justify-start"} animate-fade-in`}
                >
                  <div className={`max-w-[80%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    
                    {/* STANDARD TEXT */}
                    {!linkedPlan ? (
                      <div className={`px-4 py-2.5 rounded-2xl text-xs font-sans shadow-sm leading-relaxed ${
                        isMe 
                          ? "bg-slate-900 text-white rounded-tr-sm" 
                          : "bg-card/80 backdrop-blur-sm text-foreground rounded-tl-sm border border-border/60"
                      }`}>
                        {msg.text}
                      </div>
                    ) : (
                      /* PLAN CARD COMPONENT */
                      <div className="bg-card/70 backdrop-blur-md rounded-2xl border border-border/70 shadow-lg overflow-hidden w-64 md:w-72">
                        <div className="bg-gradient-to-tr from-rose-400 to-rose-600 text-white p-3.5">
                          <span className="text-[9px] font-mono uppercase tracking-widest font-extrabold bg-card/20 px-2 py-0.5 rounded-full">
                            ✨ NEST OUTING PROPOSAL
                          </span>
                          <h5 className="font-sans font-black text-sm mt-1.5 leading-tight">
                            {linkedPlan.title}
                          </h5>
                        </div>

                        <div className="p-3.5 space-y-2 text-xs font-sans">
                          {/* DateTime */}
                          <div className="flex items-center gap-1.5 text-foreground">
                            <Clock size={13} className="text-primary shrink-0" />
                            <span className="font-semibold text-[11px]">
                              {linkedPlan.date} @ {linkedPlan.time}
                            </span>
                          </div>

                          {/* Location */}
                          <div className="flex items-start gap-1.5 text-foreground">
                            <MapPin size={13} className="text-primary shrink-0 mt-0.5" />
                            <div className="leading-tight">
                              <span className="font-bold text-[11px] block">{linkedPlan.locationName}</span>
                              <span className="text-[9px] text-muted-foreground font-mono block mt-0.5">
                                {linkedPlan.locationAddress}
                              </span>
                            </div>
                          </div>

                          {/* Notes */}
                          {linkedPlan.notes && (
                            <div className="bg-card/50 rounded-xl p-2.5 text-[10px] text-muted-foreground border border-border/40">
                              <span className="font-bold text-muted-foreground block mb-0.5">Notes:</span>
                              "{linkedPlan.notes}"
                            </div>
                          )}

                          {/* STATUS LABELS */}
                          <div className="pt-2.5 border-t border-border/30 flex items-center justify-between">
                            <span className="text-[9px] font-mono uppercase tracking-wider font-extrabold text-muted-foreground">
                              Status:
                            </span>

                            {linkedPlan.status === "pending" ? (
                              isOwnMessage(linkedPlan.senderId, currentUserId) ? (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/50">
                                  Awaiting Reply
                                </span>
                              ) : (
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => onRespondToPlan(activeMatch.id, linkedPlan.id, "declined")}
                                    className="p-1 rounded-full bg-card/60 text-muted-foreground hover:bg-card/80 border border-border/40 transition shadow-sm"
                                  >
                                    <X size={14} />
                                  </button>
                                  <button
                                    onClick={() => onRespondToPlan(activeMatch.id, linkedPlan.id, "accepted")}
                                    className="px-2.5 py-1 bg-emerald-500 text-white font-bold text-[10px] rounded-lg shadow-sm flex items-center gap-0.5 hover:bg-emerald-600 transition"
                                  >
                                    <Check size={11} strokeWidth={3} />
                                    <span>Accept</span>
                                  </button>
                                </div>
                              )
                            ) : linkedPlan.status === "accepted" ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/50 flex items-center gap-0.5">
                                <Check size={11} strokeWidth={3} />
                                <span>Accepted!</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-muted-foreground bg-card/50 px-2.5 py-0.5 rounded-full border border-border/40">
                                Declined
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Timestamp label */}
                    <span className="text-[9px] text-muted-foreground font-mono mt-1 px-1">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies suggestion bar */}
          {activeMatch.messages.length === 0 && (
            <div className="px-5 py-2.5 border-t border-border/20 flex gap-2 overflow-x-auto select-none grow-0 shrink-0">
              {[
                "Hola! How's Madrid treating you?",
                "Coffee this week?",
                "What are you studying?"
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setInputText(suggestion)}
                  className="px-3 py-1.5 rounded-full border border-border text-[11px] font-sans font-bold text-muted-foreground bg-card hover:bg-card whitespace-nowrap shrink-0 transition"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Message input field */}
          <form onSubmit={handleSendText} className="px-5 py-3.5 border-t border-border/30 flex items-center gap-2 bg-card/30 backdrop-blur-md grow-0 shrink-0">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Text ${activeMatch.profile.name.split(" ")[0]}...`}
              className="flex-1 bg-card/40 border border-border/50 rounded-xl px-4 py-2 text-xs font-sans text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition active:scale-95 shrink-0 shadow-md shadow-rose-200/50"
            >
              <Send size={15} />
            </button>
          </form>
        </div>

        {/* OUTINGS SCHEDULER SIDE PANEL */}
        <AnimatePresence>
          {showScheduler && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute md:relative inset-y-0 right-0 w-full md:w-[380px] bg-card/75 backdrop-blur-xl border-l border-border/40 flex flex-col z-15 shadow-2xl md:shadow-none overflow-hidden"
            >
              {/* Scheduler Header */}
              <div className="px-4 py-3 border-b border-border/30 bg-card/30 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-primary" />
                  <span className="font-sans font-black text-xs text-foreground uppercase tracking-wider">
                    Outing Planner
                  </span>
                </div>
                <button
                  onClick={() => setShowScheduler(false)}
                  className="p-1 rounded-full hover:bg-card/40 text-muted-foreground"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Setup fields */}
              <form onSubmit={handleScheduleOuting} className="flex-1 overflow-y-auto p-4 space-y-4">
                
                {/* 1. Map selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono font-black text-muted-foreground tracking-widest block">
                    1. Select venue on Madrid Map
                  </label>
                  
                  {/* Map representation */}
                  <Map 
                    selectedSpotId={selectedSpot?.id}
                    onSelectSpot={handleSelectSpot}
                    highlightedSpots={suggestedSpots.map(s => s.id)}
                  />
                  
                  {/* Suggestions Carousel based on interests */}
                  <div className="pt-2">
                    <span className="text-[9px] font-sans font-bold text-primary block mb-1">
                      📍 Suggested Venues Based on your Shared Interests:
                    </span>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {suggestedSpots.map(spot => (
                        <button
                          key={spot.id}
                          type="button"
                          onClick={() => handleSelectSpot(spot)}
                          className={`px-2.5 py-1 rounded-lg border text-[10px] font-sans font-bold transition whitespace-nowrap shrink-0 ${
                            selectedSpot?.id === spot.id
                              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                              : "bg-accent/50 text-primary border-border/50 hover:bg-accent/30"
                          }`}
                        >
                          {spot.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Selected spot details */}
                {selectedSpot && (
                  <div className="bg-card/50 backdrop-blur-sm rounded-xl p-3 border border-border/55 text-xs shadow-sm">
                    <div className="font-bold text-foreground mb-0.5">📍 {selectedSpot.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono mb-1">{selectedSpot.address}</div>
                    <div className="text-[10px] text-muted-foreground leading-normal bg-card/40 p-1.5 rounded border border-border/50">
                      Best for: {selectedSpot.bestFor.join(", ")}
                    </div>
                  </div>
                )}

                {/* Outing info */}
                <div className="space-y-3 pt-2">
                  <label className="text-[10px] uppercase font-mono font-black text-muted-foreground tracking-widest block">
                    2. Proposal Details
                  </label>

                  {/* Outing Title */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-sans font-bold text-muted-foreground block">Outing Title</span>
                    <input
                      type="text"
                      value={planTitle}
                      onChange={(e) => setPlanTitle(e.target.value)}
                      placeholder="e.g. Sourdough pastries & study session!"
                      className="w-full bg-card/50 border border-border/50 rounded-lg px-3 py-1.5 text-xs font-sans text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  {/* Date & Time Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-sans font-bold text-muted-foreground block">Date</span>
                      <input
                        type="date"
                        value={planDate}
                        onChange={(e) => setPlanDate(e.target.value)}
                        className="w-full bg-card/50 border border-border/50 rounded-lg px-3 py-1.5 text-xs font-sans text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-sans font-bold text-muted-foreground block">Time</span>
                      <input
                        type="time"
                        value={planTime}
                        onChange={(e) => setPlanTime(e.target.value)}
                        className="w-full bg-card/50 border border-border/50 rounded-lg px-3 py-1.5 text-xs font-sans text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-sans font-bold text-muted-foreground block">Add a cute message</span>
                    <textarea
                      value={planNotes}
                      onChange={(e) => setPlanNotes(e.target.value)}
                      placeholder="e.g. Let's do some pilates first and then treat ourselves! What do you think?"
                      rows={2}
                      className="w-full bg-card/50 border border-border/50 rounded-lg p-2 text-xs font-sans text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    />
                  </div>
                </div>

                {/* Error Box */}
                {schedulerError && (
                  <div className="bg-accent/30 text-primary p-2.5 rounded-lg border border-border/70 flex items-start gap-1.5 text-[10px] font-sans">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{schedulerError}</span>
                  </div>
                )}

                {/* Submit Outing */}
                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary text-primary-foreground font-sans text-xs font-bold rounded-xl shadow-lg shadow-rose-200/50 hover:bg-primary/90 transition flex items-center justify-center gap-1.5 mt-2"
                >
                  <Calendar size={14} />
                  <span>Send Outing Proposal</span>
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
