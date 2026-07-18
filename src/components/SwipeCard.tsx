import React, { useState, useRef, useEffect } from "react";
import { UserProfile } from "../types";
import { calculateCompatibility } from "../data";
import { ANIMAL_EMOJI } from "../../shared/compatibility";
import { X, Heart, MapPin, Languages, Sparkles, GraduationCap, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import VerifiedBadge from "./VerifiedBadge";

interface SwipeCardProps {
  profile: UserProfile;
  currentUser: UserProfile;
  onSwipeLeft: () => void;
  onSwipeRight: (isMatch: boolean) => void;
}

export default function SwipeCard({ profile, currentUser, onSwipeLeft, onSwipeRight }: SwipeCardProps) {
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Expanding makes the card taller than a phone screen, so bring it to the
  // top of the scroll area afterwards. scrollIntoView misreads the position
  // while the card still carries an animation transform, so the owning
  // scroller is moved explicitly once the height transition has settled.
  const openFullProfile = () => {
    setShowFullProfile(true);
    window.setTimeout(() => {
      const card = cardRef.current;
      if (!card) return;
      let scroller = card.parentElement;
      while (scroller && scroller.scrollHeight <= scroller.clientHeight + 1) {
        scroller = scroller.parentElement;
      }
      if (!scroller) return;
      const delta = card.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
      scroller.scrollTo({ top: scroller.scrollTop + delta - 8, behavior: "smooth" });
    }, 340);
  };

  // Older profiles only have the single `photo` field.
  const gallery = profile.photos?.length ? profile.photos : [profile.photo];

  // Each card starts fresh: without this the gallery index and the expanded
  // state carried over to the next woman, so someone with a single photo
  // could render a blank image box.
  useEffect(() => {
    setPhotoIndex(0);
    setShowFullProfile(false);
  }, [profile.id]);
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
    // Whether this is a match is decided by the server, never here.
    setTimeout(() => {
      onSwipeRight(false);
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
          ref={cardRef}
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
          className={`bg-card/40 backdrop-blur-xl rounded-[32px] border border-border/60 shadow-2xl overflow-hidden flex flex-col transition-[height] duration-300 ${
            showFullProfile ? "h-[640px] md:h-[720px]" : "h-[520px] md:h-[580px]"
          }`}
        >
          {/* Real Portrait Photo Background */}
          <div className={`relative bg-muted overflow-hidden shrink-0 transition-[height] duration-300 ${
            showFullProfile ? "h-44 md:h-52" : "h-60 md:h-68"
          }`}>
            <img
              src={gallery[photoIndex]}
              alt={gallery.length > 1 ? `${profile.name}, photo ${photoIndex + 1} of ${gallery.length}` : profile.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />

            {/* Photo gallery: tap either half to move through her photos */}
            {gallery.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setPhotoIndex(i => (i - 1 + gallery.length) % gallery.length)}
                  aria-label="Previous photo"
                  className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer focus-visible:bg-foreground/5"
                />
                <button
                  type="button"
                  onClick={() => setPhotoIndex(i => (i + 1) % gallery.length)}
                  aria-label="Next photo"
                  className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-pointer focus-visible:bg-foreground/5"
                />
                <div className="absolute top-2.5 left-0 w-full px-4 flex gap-1.5 z-20" aria-hidden="true">
                  {gallery.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i === photoIndex ? "bg-white" : "bg-white/35"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
            {/* Dark gradient overlay for text readability on top and bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/30" />

            {/* Banner Top Row */}
            <div className="absolute top-4 left-0 w-full px-5 flex justify-between items-start z-10">
              <span className="bg-slate-900/60 backdrop-blur-md text-white font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-border/10 shadow-sm">
                {profile.nationality} ✈️
              </span>

              {/* Verification badge lives beside the name below, not on the photo */}
            </div>

            {/* Avatar & Matching score row */}
            <div className="absolute bottom-3 left-0 w-full px-5 flex items-end justify-between z-10">
              {/* Initials Small Circle on edge */}
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${profile.avatarColor} shadow-lg flex items-center justify-center border-2 border-border/90`}>
                <span className="font-sans font-extrabold text-white text-base select-none">
                  {profile.name[0]}
                </span>
              </div>

              {/* Compatibility score ring */}
              <div className="flex flex-col items-center bg-card/90 backdrop-blur-md text-foreground rounded-2xl px-3 py-1.5 border border-border/75 shadow-md">
                <div className="font-sans font-black text-sm md:text-base text-primary leading-tight">
                  {report.score}%
                </div>
                <div className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground leading-none">
                  Match
                </div>
              </div>
            </div>
          </div>

          {/* Profile Name & Primary Info Section */}
          <div className="px-6 pt-5 md:pt-8 pb-3 border-b border-border/20 shrink-0">
            <div className="flex items-baseline gap-x-2 gap-y-1 flex-wrap mb-1.5">
              <h3 className="font-display text-2xl text-foreground">
                {profile.name}
              </h3>
              <span className="font-display text-xl text-muted-foreground">
                {profile.age}
              </span>
              <VerifiedBadge profile={profile} />
            </div>

            <div className="flex flex-col gap-1 text-xs text-muted-foreground font-sans">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <GraduationCap size={14} className="text-primary" />
                <span>{profile.university}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-muted-foreground" />
                <span>Currently in {profile.currentCity}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Languages size={14} className="text-muted-foreground" />
                <span>Speaks: {profile.languages.join(", ")}</span>
              </div>
              {profile.tiktok && (
                <div className="flex items-center gap-1.5 font-bold text-foreground mt-0.5">
                  <span className="w-4.5 h-4.5 rounded bg-black flex items-center justify-center text-[10px] text-rose-400 font-mono font-black shrink-0 select-none">𝅘𝅥𝅮</span>
                  <span>TikTok: <span className="text-primary hover:underline">@{profile.tiktok}</span></span>
                </div>
              )}
            </div>
          </div>

          {/* Scrollable Interests & Details Area */}
          <div className="px-6 py-4 overflow-y-auto grow select-text">
            {/* Short Bio */}
            <div className="mb-4">
              <span className="text-[10px] font-mono font-extrabold uppercase text-primary tracking-wider block mb-1">
                Bio & Vibe
              </span>
              <p className="text-xs text-foreground leading-relaxed font-sans italic">
                "{profile.bio}"
              </p>
            </div>

            {/* Compatibility Quick Report */}
            <div className="bg-accent/60 rounded-2xl p-3.5 border border-border/50 mb-4 shadow-sm">
              <div className="flex items-center gap-1.5 text-primary font-sans font-bold text-xs mb-1">
                <Sparkles size={12} />
                <span>Why you'll match</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                {report.explanation}
              </p>
              {report.sharedInterests.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {report.sharedInterests.slice(0, 3).map(interest => (
                    <span key={interest} className="text-[9px] bg-accent/60 text-primary px-2 py-0.5 rounded-full font-sans font-bold">
                      ✓ {interest}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Expandable full profile details */}
            {!showFullProfile ? (
              <button
                onClick={openFullProfile}
                className="w-full py-3 border border-border/60 rounded-2xl text-foreground bg-card/60 backdrop-blur-sm font-sans text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-card transition shadow-sm"
              >
                <span>See her full profile</span>
                <ChevronDown size={14} />
              </button>
            ) : (
              <div className="space-y-4 pt-1 animate-fade-in">
                {/* Friendship style */}
                <div className="bg-card/30 rounded-xl p-2.5 border border-border/40">
                  <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest block">
                    Friendship Goal
                  </span>
                  <span className="font-sans font-extrabold text-primary text-[12px] leading-tight block">
                    {profile.friendshipType}
                  </span>
                </div>

                {/* Categorized Predefined Interests */}
                <div className="space-y-3.5">
                  {/* Activities */}
                  <div>
                    <span className="text-[10px] font-mono font-extrabold uppercase text-muted-foreground tracking-widest block mb-2">
                      Activities
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.interests.activities.map((act) => {
                        const shared = isSharedActivity(act);
                        return (
                          <span
                            key={act}
                            className={`text-[11px] px-3 py-1.5 rounded-full font-sans transition-colors ${
                              shared
                                ? "bg-accent/60 text-primary border border-border/40 font-semibold shadow-sm"
                                : "bg-card/40 text-muted-foreground border border-border/40"
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
                    <span className="text-[10px] font-mono font-extrabold uppercase text-muted-foreground tracking-widest block mb-2">
                      Social Plans
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.interests.social.map((soc) => {
                        const shared = isSharedSocial(soc);
                        return (
                          <span
                            key={soc}
                            className={`text-[11px] px-3 py-1.5 rounded-full font-sans transition-colors ${
                              shared
                                ? "bg-amber-100 text-amber-700 border border-amber-200/40 font-semibold shadow-sm"
                                : "bg-card/40 text-muted-foreground border border-border/40"
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
                    <span className="text-[10px] font-mono font-extrabold uppercase text-muted-foreground tracking-widest block mb-2">
                      Music Taste
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.interests.music.map((mus) => {
                        const shared = isSharedMusic(mus);
                        return (
                          <span
                            key={mus}
                            className={`text-[11px] px-3 py-1.5 rounded-full font-sans transition-colors ${
                              shared
                                ? "bg-indigo-100 text-indigo-700 border border-indigo-200/40 font-semibold shadow-sm"
                                : "bg-card/40 text-muted-foreground border border-border/40"
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
                    <span className="text-[10px] font-mono font-extrabold uppercase text-muted-foreground tracking-widest block mb-2">
                      Lifestyle Vibe
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.interests.lifestyle.map((life) => {
                        const shared = isSharedLifestyle(life);
                        return (
                          <span
                            key={life}
                            className={`text-[11px] px-3 py-1.5 rounded-full font-sans transition-colors ${
                              shared
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200/40 font-semibold shadow-sm"
                                : "bg-card/40 text-muted-foreground border border-border/40"
                            }`}
                          >
                            {life} {shared && "✨"}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Spending Style */}
                  <div className="pt-2 border-t border-border/20">
                    <span className="text-[9px] font-mono font-extrabold uppercase text-muted-foreground tracking-widest block">
                      Spending Style
                    </span>
                    <span className={`text-xs font-sans font-bold inline-block px-3 py-1 rounded-xl mt-1 ${
                      currentUser.interests.spendingStyle === profile.interests.spendingStyle
                        ? "bg-accent/60 text-primary border border-border/50"
                        : "bg-card/40 text-muted-foreground border border-border/40"
                    }`}>
                      👑 {profile.interests.spendingStyle}
                      {currentUser.interests.spendingStyle === profile.interests.spendingStyle && " (Match!)"}
                    </span>
                  </div>

                  {/* Animals */}
                  {profile.interests.animals && (
                    <div className="pt-2 border-t border-border/20">
                      <span className="text-[10px] font-mono font-extrabold uppercase text-muted-foreground tracking-widest block">
                        Animals
                      </span>
                      <span className={`text-xs font-sans font-bold inline-block px-3 py-1 rounded-xl mt-1 ${
                        currentUser.interests.animals === profile.interests.animals
                          ? "bg-accent/60 text-primary border border-border/50"
                          : "bg-card/40 text-muted-foreground border border-border/40"
                      }`}>
                        {ANIMAL_EMOJI[profile.interests.animals] || "🐾"} {profile.interests.animals}
                        {currentUser.interests.animals === profile.interests.animals && " (Match!)"}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowFullProfile(false)}
                  className="w-full py-3 border border-border/60 rounded-2xl text-foreground bg-card/60 backdrop-blur-sm font-sans text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-card transition mt-4 shadow-sm"
                >
                  <span>Show less</span>
                  <ChevronUp size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Swipe/Match Action Buttons Footer */}
          <div className="px-6 py-4 bg-card/25 border-t border-border/30 flex items-center justify-center gap-5 shrink-0">
            {/* Left/Dislike Button */}
            <button
              onClick={handlePass}
              className="w-14 h-14 rounded-full bg-card/60 border border-border/50 shadow-md text-muted-foreground flex items-center justify-center hover:bg-accent/30 hover:text-primary hover:border-border hover:scale-105 transition-all duration-200 active:scale-95"
            >
              <X size={26} strokeWidth={2.5} />
            </button>

            {/* Right/Like Button */}
            <button
              onClick={handleLike}
              className="w-16 h-16 rounded-full bg-primary shadow-pop-lg text-primary-foreground flex items-center justify-center hover:bg-primary/90 hover:scale-105 transition-all duration-200 active:scale-95 border border-rose-400"
            >
              <Heart size={30} fill="currentColor" stroke="none" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
