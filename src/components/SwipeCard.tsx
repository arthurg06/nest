import React, { useState } from "react";
import { UserProfile } from "../types";
import { calculateCompatibility } from "../data";
import { X, Heart, ShieldCheck, MapPin, Languages, Sparkles, GraduationCap, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SwipeCardProps {
  profile: UserProfile;
  currentUser: UserProfile;
  onSwipeLeft: () => void;
  onSwipeRight: (isMatch: boolean) => void;
}

export default function SwipeCard({ profile, currentUser, onSwipeLeft, onSwipeRight }: SwipeCardProps) {
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);

  // Calculate compatibility using the core function
  const report = calculateCompatibility(currentUser, profile);

  // Handle Swipe triggers
  const handlePass = () => {
    setSwipeDirection("left");
    setTimeout(() => {
      onSwipeLeft();
      setSwipeDirection(null);
    }, 250);
  };

  const handleLike = () => {
    setSwipeDirection("right");
    // 60% chance to simulate a match immediately on swipe-right for a rewarding social experience!
    const isMatch = Math.random() < 0.6;
    setTimeout(() => {
      onSwipeRight(isMatch);
      setSwipeDirection(null);
    }, 250);
  };

  // Helper to determine interest overlaps
  const isSharedActivity = (act: string) => currentUser.interests.activities.includes(act);
  const isSharedMusic = (mus: string) => currentUser.interests.music.includes(mus);
  const isSharedSocial = (soc: string) => currentUser.interests.social.includes(soc);
  const isSharedLifestyle = (life: string) => currentUser.interests.lifestyle.includes(life);

  return (
    <div className="relative w-full max-w-md mx-auto">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={profile.id}
          id={`swipe-card-${profile.id}`}
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{
            scale: 1,
            opacity: 1,
            y: 0,
            x: swipeDirection === "left" ? -400 : swipeDirection === "right" ? 400 : 0,
            rotate: swipeDirection === "left" ? -15 : swipeDirection === "right" ? 15 : 0,
          }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="bg-white/40 backdrop-blur-xl rounded-[32px] border border-white/60 shadow-2xl overflow-hidden flex flex-col h-[520px] md:h-[580px]"
        >
          {/* Real Portrait Photo Background */}
          <div className="relative h-60 md:h-68 bg-slate-100 overflow-hidden shrink-0">
            <img
              src={profile.photo}
              alt={profile.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            {/* Dark gradient overlay for text readability on top and bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/30" />

            {/* Banner Top Row */}
            <div className="absolute top-4 left-0 w-full px-5 flex justify-between items-start z-10">
              <span className="bg-slate-900/60 backdrop-blur-md text-white font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/10 shadow-sm">
                {profile.nationality} ✈️
              </span>

              {/* Gold Verification Badge */}
              {profile.isVerified && (
                <div className="flex items-center gap-1 bg-white/80 backdrop-blur-md text-rose-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/70 shadow-sm animate-pulse">
                  <ShieldCheck size={12} className="text-rose-500 fill-rose-100" />
                  <span>Student Verified</span>
                </div>
              )}
            </div>

            {/* Avatar & Matching score row */}
            <div className="absolute bottom-3 left-0 w-full px-5 flex items-end justify-between z-10">
              {/* Initials Small Circle on edge */}
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${profile.avatarColor} shadow-lg flex items-center justify-center border-2 border-white/90`}>
                <span className="font-sans font-extrabold text-white text-base select-none">
                  {profile.name[0]}
                </span>
              </div>

              {/* Compatibility score ring */}
              <div className="flex flex-col items-center bg-white/90 backdrop-blur-md text-slate-800 rounded-2xl px-3 py-1.5 border border-white/75 shadow-md">
                <div className="font-sans font-black text-sm md:text-base text-rose-500 leading-tight">
                  {report.score}%
                </div>
                <div className="font-mono text-[8px] uppercase tracking-widest text-slate-500 leading-none">
                  Match
                </div>
              </div>
            </div>
          </div>

          {/* Profile Name & Primary Info Section */}
          <div className="px-6 pt-5 md:pt-8 pb-3 border-b border-white/20 shrink-0">
            <div className="flex items-baseline gap-2 mb-1.5">
              <h3 className="font-display text-2xl text-slate-950">
                {profile.name}
              </h3>
              <span className="font-display text-xl text-slate-400">
                {profile.age}
              </span>
            </div>

            <div className="flex flex-col gap-1 text-xs text-slate-500 font-sans">
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <GraduationCap size={14} className="text-rose-500" />
                <span>{profile.university}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-slate-400" />
                <span>Currently in {profile.currentCity}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Languages size={14} className="text-slate-400" />
                <span>Speaks: {profile.languages.join(", ")}</span>
              </div>
              {profile.tiktok && (
                <div className="flex items-center gap-1.5 font-bold text-slate-700 mt-0.5">
                  <span className="w-4.5 h-4.5 rounded bg-black flex items-center justify-center text-[10px] text-rose-400 font-mono font-black shrink-0 select-none">𝅘𝅥𝅮</span>
                  <span>TikTok: <span className="text-rose-500 hover:underline">@{profile.tiktok}</span></span>
                </div>
              )}
            </div>
          </div>

          {/* Scrollable Interests & Details Area */}
          <div className="px-6 py-4 overflow-y-auto grow select-text">
            {/* Short Bio */}
            <div className="mb-4">
              <span className="text-[10px] font-mono font-extrabold uppercase text-rose-500 tracking-wider block mb-1">
                Bio & Vibe
              </span>
              <p className="text-xs text-slate-700 leading-relaxed font-sans italic">
                "{profile.bio}"
              </p>
            </div>

            {/* Compatibility Quick Report */}
            <div className="bg-rose-50/60 rounded-2xl p-3.5 border border-rose-100/50 mb-4 shadow-sm">
              <div className="flex items-center gap-1.5 text-rose-600 font-sans font-bold text-xs mb-1">
                <Sparkles size={12} />
                <span>Why you'll match</span>
              </div>
              <p className="text-[11px] text-slate-600 font-sans leading-relaxed">
                {report.explanation}
              </p>
              {report.sharedInterests.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {report.sharedInterests.slice(0, 3).map(interest => (
                    <span key={interest} className="text-[9px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-sans font-bold">
                      ✓ {interest}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Expandable full profile details */}
            {!showFullProfile ? (
              <button
                onClick={() => setShowFullProfile(true)}
                className="w-full py-1.5 border border-white/50 rounded-xl text-slate-500 bg-white/40 backdrop-blur-sm font-sans text-xs font-bold flex items-center justify-center gap-1 hover:bg-white/60 transition shadow-sm"
              >
                <span>View Full Interests Profile</span>
                <ChevronDown size={14} />
              </button>
            ) : (
              <div className="space-y-4 pt-1 animate-fade-in">
                {/* Friendship style */}
                <div className="bg-white/30 rounded-xl p-2.5 border border-white/40">
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest block">
                    Friendship Goal
                  </span>
                  <span className="font-sans font-extrabold text-rose-500 text-[12px] leading-tight block">
                    {profile.friendshipType}
                  </span>
                </div>

                {/* Categorized Predefined Interests */}
                <div className="space-y-3.5">
                  {/* Activities */}
                  <div>
                    <span className="text-[9px] font-mono font-extrabold uppercase text-slate-400 tracking-widest block mb-1.5">
                      Activities
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.interests.activities.map((act) => {
                        const shared = isSharedActivity(act);
                        return (
                          <span
                            key={act}
                            className={`text-[10px] px-3 py-1 rounded-full font-sans transition-colors ${
                              shared
                                ? "bg-rose-100 text-rose-700 border border-rose-200/40 font-semibold shadow-sm"
                                : "bg-white/40 text-slate-500 border border-white/40"
                            }`}
                          >
                            {act} {shared && "✨"}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Social */}
                  <div>
                    <span className="text-[9px] font-mono font-extrabold uppercase text-slate-400 tracking-widest block mb-1.5">
                      Social Plans
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.interests.social.map((soc) => {
                        const shared = isSharedSocial(soc);
                        return (
                          <span
                            key={soc}
                            className={`text-[10px] px-3 py-1 rounded-full font-sans transition-colors ${
                              shared
                                ? "bg-amber-100 text-amber-700 border border-amber-200/40 font-semibold shadow-sm"
                                : "bg-white/40 text-slate-500 border border-white/40"
                            }`}
                          >
                            {soc} {shared && "✨"}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Music */}
                  <div>
                    <span className="text-[9px] font-mono font-extrabold uppercase text-slate-400 tracking-widest block mb-1.5">
                      Music Taste
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.interests.music.map((mus) => {
                        const shared = isSharedMusic(mus);
                        return (
                          <span
                            key={mus}
                            className={`text-[10px] px-3 py-1 rounded-full font-sans transition-colors ${
                              shared
                                ? "bg-indigo-100 text-indigo-700 border border-indigo-200/40 font-semibold shadow-sm"
                                : "bg-white/40 text-slate-500 border border-white/40"
                            }`}
                          >
                            {mus} {shared && "✨"}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Lifestyle */}
                  <div>
                    <span className="text-[9px] font-mono font-extrabold uppercase text-slate-400 tracking-widest block mb-1.5">
                      Lifestyle Vibe
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.interests.lifestyle.map((life) => {
                        const shared = isSharedLifestyle(life);
                        return (
                          <span
                            key={life}
                            className={`text-[10px] px-3 py-1 rounded-full font-sans transition-colors ${
                              shared
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200/40 font-semibold shadow-sm"
                                : "bg-white/40 text-slate-500 border border-white/40"
                            }`}
                          >
                            {life} {shared && "✨"}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Spending Style */}
                  <div className="pt-2 border-t border-white/20">
                    <span className="text-[9px] font-mono font-extrabold uppercase text-slate-400 tracking-widest block">
                      Spending Style
                    </span>
                    <span className={`text-xs font-sans font-bold inline-block px-3 py-1 rounded-xl mt-1 ${
                      currentUser.interests.spendingStyle === profile.interests.spendingStyle
                        ? "bg-rose-100 text-rose-700 border border-rose-200/50"
                        : "bg-white/40 text-slate-600 border border-white/40"
                    }`}>
                      👑 {profile.interests.spendingStyle}
                      {currentUser.interests.spendingStyle === profile.interests.spendingStyle && " (Match!)"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setShowFullProfile(false)}
                  className="w-full py-1.5 border border-white/50 rounded-xl text-slate-500 bg-white/40 backdrop-blur-sm font-sans text-xs font-bold flex items-center justify-center gap-1 hover:bg-white/60 transition mt-4 shadow-sm"
                >
                  <span>Hide Full Interests Profile</span>
                  <ChevronUp size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Swipe/Match Action Buttons Footer */}
          <div className="px-6 py-4 bg-white/25 border-t border-white/30 flex items-center justify-center gap-5 shrink-0">
            {/* Left/Dislike Button */}
            <button
              onClick={handlePass}
              className="w-14 h-14 rounded-full bg-white/60 border border-white/50 shadow-md text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 hover:scale-105 transition-all duration-200 active:scale-95"
            >
              <X size={26} strokeWidth={2.5} />
            </button>

            {/* Right/Like Button */}
            <button
              onClick={handleLike}
              className="w-16 h-16 rounded-full bg-rose-500 shadow-xl shadow-rose-200/50 text-white flex items-center justify-center hover:bg-rose-600 hover:scale-105 transition-all duration-200 active:scale-95 border border-rose-400"
            >
              <Heart size={30} fill="currentColor" stroke="none" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
