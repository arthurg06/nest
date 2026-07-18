import React, { useState, useEffect, useRef } from "react";
import { Match, UserProfile, Plan, Recommendation } from "../types";
import { Send, MapPin, Clock, Calendar, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { isOwnMessage } from "../lib/chat";
import VerifiedBadge from "./VerifiedBadge";
import OutingPlanner, { OutingDraft } from "./OutingPlanner";

interface ChatWindowProps {
  activeMatch: Match;
  currentUser: UserProfile;
  currentUserId: string;
  recommendations: Recommendation[];
  onSendMessage: (matchId: string, text: string) => void;
  onSuggestPlan: (matchId: string, draft: OutingDraft) => Promise<string | null>;
  onRespondToPlan: (planId: string, status: "accepted" | "declined") => Promise<string | null>;
}

export default function ChatWindow({
  activeMatch,
  currentUser,
  currentUserId,
  recommendations,
  onSendMessage,
  onSuggestPlan,
  onRespondToPlan
}: ChatWindowProps) {
  const [inputText, setInputText] = useState("");
  const [showPlanner, setShowPlanner] = useState(false);
  const [sending, setSending] = useState(false);
  const [plannerError, setPlannerError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const plans = activeMatch.plans || [];

  // Scroll down when the conversation actually changes — not on every poll.
  // The five-second refresh hands us a new array each time, so depending on
  // the array itself would yank the view back down while she reads history.
  const lastMessageId = activeMatch.messages[activeMatch.messages.length - 1]?.id;
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMatch.id, activeMatch.messages.length, lastMessageId]);

  // Messages only ever come from real members — nobody is answered automatically.
  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(activeMatch.id, inputText.trim());
    setInputText("");
  };

  const handleSendPlan = async (draft: OutingDraft) => {
    setSending(true);
    setPlannerError("");
    const error = await onSuggestPlan(activeMatch.id, draft);
    setSending(false);
    if (error) {
      setPlannerError(error);
      return;
    }
    setShowPlanner(false);
  };

  const sharedInterests = [
    ...currentUser.interests.activities.filter(a => activeMatch.profile.interests.activities.includes(a)),
    ...currentUser.interests.music.filter(m => activeMatch.profile.interests.music.includes(m)),
    ...currentUser.interests.social.filter(s => activeMatch.profile.interests.social.includes(s))
  ];

  const renderPlanCard = (plan: Plan) => {
    const isMine = isOwnMessage(plan.senderId, currentUserId);
    return (
      <div className="bg-card/70 backdrop-blur-md rounded-2xl border border-border/70 shadow-lg overflow-hidden w-64 md:w-72">
        <div className="bg-primary text-primary-foreground p-3.5">
          <span className="text-[9px] font-mono uppercase tracking-widest font-extrabold opacity-90">
            Outing invite
          </span>
          <h5 className="font-sans font-black text-sm mt-1 leading-tight">{plan.title}</h5>
        </div>

        <div className="p-3.5 space-y-2 text-xs font-sans">
          <div className="flex items-center gap-1.5 text-foreground">
            <Clock size={13} className="text-primary shrink-0" />
            <span className="font-semibold text-[11px]">
              {new Date(`${plan.date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} at {plan.time}
            </span>
          </div>

          <div className="flex items-start gap-1.5 text-foreground">
            <MapPin size={13} className="text-primary shrink-0 mt-0.5" />
            <span className="leading-tight min-w-0">
              <span className="font-bold text-[11px] block">{plan.placeName}</span>
              {(plan.placeArea || plan.placeAddress) && (
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  {[plan.placeArea, plan.placeAddress].filter(Boolean).join(" · ")}
                </span>
              )}
            </span>
          </div>

          {plan.note && (
            <p className="bg-muted/40 rounded-xl p-2.5 text-[10px] text-muted-foreground border border-border/40 leading-normal">
              {plan.note}
            </p>
          )}

          <div className="pt-2.5 border-t border-border/30">
            {plan.status === "pending" ? (
              isMine ? (
                <span className="text-[10px] font-bold text-muted-foreground">Waiting for her reply…</span>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => onRespondToPlan(plan.id, "declined")}
                    className="flex-1 py-2 rounded-lg bg-card border border-border/60 text-muted-foreground font-bold text-[10px] hover:bg-muted transition"
                  >
                    Can't make it
                  </button>
                  <button
                    onClick={() => onRespondToPlan(plan.id, "accepted")}
                    className="flex-1 py-2 rounded-lg bg-success text-success-foreground font-bold text-[10px] flex items-center justify-center gap-1 hover:opacity-90 transition"
                  >
                    <Check size={12} strokeWidth={3} />
                    <span>I'm in</span>
                  </button>
                </div>
              )
            ) : plan.status === "accepted" ? (
              <span className="text-[10px] font-bold text-success bg-success-muted border border-success-border px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                <Check size={11} strokeWidth={3} />
                <span>It's on</span>
              </span>
            ) : (
              <span className="text-[10px] font-bold text-muted-foreground">
                {isMine ? "She can't make it this time" : "You declined"}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-card/40 backdrop-blur-xl rounded-[28px] border border-border/60 shadow-2xl overflow-hidden relative">
      {/* Header */}
      <div className="px-4 md:px-5 py-3 border-b border-border/30 flex items-center justify-between gap-3 bg-card/30 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={activeMatch.profile.photo}
            alt={activeMatch.profile.name}
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-xl object-cover shadow-sm shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-sans font-bold text-sm text-foreground leading-none truncate">
                {activeMatch.profile.name}
              </h4>
              <VerifiedBadge profile={activeMatch.profile} />
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight mt-1 truncate">
              {activeMatch.compatibilityRating}% match
              {sharedInterests.length > 0 && ` · you both like ${sharedInterests.slice(0, 2).join(", ")}`}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowPlanner(true)}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-sans text-xs font-bold transition bg-primary text-primary-foreground shrink-0 hover:bg-primary/90"
        >
          <Calendar size={13} />
          <span className="hidden sm:inline">Plan an outing</span>
          <span className="sm:hidden">Plan</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 md:px-5 py-4 space-y-4">
        {activeMatch.messages.length === 0 && (
          <p className="text-center text-[11px] text-muted-foreground max-w-xs mx-auto py-4">
            You matched. Say hi, or suggest a coffee — plans are easier than small talk.
          </p>
        )}

        {activeMatch.messages.map(msg => {
          const isMe = isOwnMessage(msg.senderId, currentUserId);
          const linkedPlan = msg.planId ? plans.find(p => p.id === msg.planId) : null;

          return (
            <div
              key={msg.id}
              role="group"
              aria-label={`Message from ${isMe ? "you" : activeMatch.profile.name}`}
              className={`flex ${isMe ? "justify-end" : "justify-start"} animate-fade-in`}
            >
              <div className={`max-w-[80%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                {linkedPlan ? (
                  renderPlanCard(linkedPlan)
                ) : (
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-xs font-sans shadow-sm leading-relaxed ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-card/80 backdrop-blur-sm text-foreground rounded-tl-sm border border-border/60"
                    }`}
                  >
                    {msg.text}
                  </div>
                )}
                <span className="text-[9px] text-muted-foreground font-mono mt-1 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Starters, only before the first message */}
      {activeMatch.messages.length === 0 && (
        <div className="px-4 md:px-5 py-2.5 border-t border-border/20 flex gap-2 overflow-x-auto shrink-0">
          {["Hola! How's Madrid treating you?", "Coffee this week?", "What are you studying?"].map(s => (
            <button
              key={s}
              onClick={() => setInputText(s)}
              className="px-3 py-2 rounded-full border border-border text-[11px] font-sans font-bold text-muted-foreground bg-card hover:bg-muted whitespace-nowrap shrink-0 transition"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={handleSendText}
        className="px-4 md:px-5 py-3 border-t border-border/30 flex items-center gap-2 bg-card/30 backdrop-blur-md shrink-0"
      >
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder={`Text ${activeMatch.profile.name.split(" ")[0]}…`}
          className="flex-1 min-w-0 bg-card/40 border border-border/50 rounded-xl px-4 py-2.5 text-xs font-sans text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          aria-label="Send message"
          className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition active:scale-95 shrink-0"
        >
          <Send size={15} />
        </button>
      </form>

      {/* Planner — an overlay inside the chat card, so it can never push the
          page taller than the viewport or slide under the bottom navigation */}
      <AnimatePresence>
        {showPlanner && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute inset-0 z-20 bg-card/95 backdrop-blur-xl flex flex-col min-h-0"
          >
            <OutingPlanner
              currentUser={currentUser}
              otherUser={activeMatch.profile}
              recommendations={recommendations}
              onSend={handleSendPlan}
              onCancel={() => {
                setShowPlanner(false);
                setPlannerError("");
              }}
              sending={sending}
              error={plannerError}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
