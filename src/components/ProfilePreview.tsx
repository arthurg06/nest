import React, { useEffect, useState } from "react";
import { UserProfile } from "../types";
import { profileFor, Audience } from "../../shared/visibility";
import SwipeCard from "./SwipeCard";
import { X, Eye, Lock, Unlock } from "lucide-react";

interface ProfilePreviewProps {
  /** Her profile as it stands right now — saved or still being written. */
  profile: UserProfile;
  onClose: () => void;
  /** True when this reflects edits she has not saved yet. */
  unsaved?: boolean;
}

// Things she can still act on. Only statements about how the app actually
// behaves — no invented claims about what gets more attention.
function suggestionsFor(profile: UserProfile): string[] {
  const notes: string[] = [];

  const photoCount = profile.photos?.length || (profile.photo ? 1 : 0);
  if (photoCount === 0) {
    notes.push("You have no photo yet, and your card opens with it.");
  } else if (photoCount === 1) {
    notes.push("You can add up to four photos — others tap through them on the card.");
  }

  if (!profile.bio?.trim()) {
    notes.push("Your bio is empty. It sits right under your name, in your own words.");
  }

  const picked =
    profile.interests.activities.length +
    profile.interests.music.length +
    profile.interests.social.length +
    profile.interests.lifestyle.length;
  if (picked === 0) {
    notes.push(
      "You haven't picked any interests. The match score is built from those, your languages and your university."
    );
  }

  if (profile.verificationStatus !== "approved") {
    notes.push("The Verified Student badge joins your name once an admin approves your verification.");
  }

  return notes;
}

/**
 * Her own card, shown back to her exactly as other members receive it.
 *
 * The card is rendered by SwipeCard — the same component the deck uses — and
 * the fields are filtered by shared/visibility.ts, the same module the server
 * filters with. Neither the look nor the privacy can drift from the real
 * thing without this screen drifting with it.
 */
export default function ProfilePreview({ profile, onClose, unsaved = false }: ProfilePreviewProps) {
  const [audience, setAudience] = useState<Audience>("everyone");

  // Escape closes, and the page behind must not scroll while this is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  // Only optional fields are ever removed, so what comes back is still a
  // complete card — but it is the filtered copy that gets rendered, never the
  // original.
  const visible = profileFor(profile, audience) as UserProfile;

  const hasHandles = Boolean(profile.instagram || profile.tiktok || profile.otherSocial);
  const suggestions = suggestionsFor(profile);

  return (
    // The card is translucent (bg-card/40), so whatever sits behind it shows
    // through and changes how it reads. This surface therefore uses the app's
    // own canvas — a dark scrim here would show her a card that looks nothing
    // like the one in the deck.
    <div
      className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="How your profile looks to other members"
    >
      <div className="w-full max-w-md mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <h2 className="font-display text-2xl text-foreground leading-tight">How others see you</h2>
            <p className="font-sans text-[11px] text-muted-foreground leading-snug mt-0.5">
              {unsaved
                ? "Your unsaved changes are included — save to make them live."
                : "This is your live card, exactly as it reaches other members."}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="shrink-0 w-10 h-10 rounded-full bg-card border border-border/70 text-foreground flex items-center justify-center hover:bg-muted transition shadow-sm"
          >
            <X size={18} />
          </button>
        </div>

        {/* Who is looking. The two views differ by exactly the fields the
            server withholds until a match exists. */}
        <div
          className="shrink-0 mx-5 mb-3 p-1 bg-card/60 border border-border/60 rounded-2xl grid grid-cols-2 gap-1 shadow-sm"
          role="tablist"
        >
          {([
            { key: "everyone", label: "Anyone on NEST", icon: Lock },
            { key: "match", label: "After you match", icon: Unlock },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={audience === key}
              onClick={() => setAudience(key)}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl font-sans text-[11px] font-bold transition ${
                audience === key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={12} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Card + notes */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-4">
          <SwipeCard profile={visible} preview />

          <div className="bg-card/50 border border-border/60 rounded-2xl p-4 space-y-3 text-muted-foreground shadow-sm">
            <div className="flex items-center gap-1.5 text-foreground font-sans font-bold text-xs">
              <Eye size={13} className="text-primary" />
              <span>{audience === "everyone" ? "Before you match" : "Once you match"}</span>
            </div>

            <p className="text-[11px] font-sans leading-relaxed">
              {audience === "everyone" ? (
                hasHandles ? (
                  <>
                    Every member browsing sees this card. Your Instagram, TikTok and other handles are
                    <strong className="text-foreground"> not part of it</strong> — they are shared only after you
                    and she have both liked each other.
                  </>
                ) : (
                  <>
                    Every member browsing sees this card. You haven't added any social handles, so this is also
                    what your matches see.
                  </>
                )
              ) : hasHandles ? (
                <>
                  Once you have both liked each other she also gets your handles, at the top of your conversation.
                  Nothing else about your profile changes.
                </>
              ) : (
                <>
                  If you added social handles, a match would get them at the top of your conversation. You haven't
                  added any, so the two views are identical.
                </>
              )}
            </p>

            <p className="text-[11px] font-sans leading-relaxed border-t border-border/50 pt-3">
              The match percentage and the ✨ marks are the one part you cannot preview: each member sees her own,
              worked out from what the two of you have in common.
            </p>
          </div>

          {suggestions.length > 0 && (
            <div className="bg-card/50 border border-border/60 rounded-2xl p-4 space-y-2 shadow-sm">
              <span className="font-sans font-bold text-xs text-foreground block">Still open to you</span>
              <ul className="space-y-1.5">
                {suggestions.map(note => (
                  <li key={note} className="text-[11px] font-sans leading-relaxed text-muted-foreground flex gap-2">
                    <span aria-hidden="true" className="text-primary shrink-0">
                      •
                    </span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 bg-primary text-primary-foreground font-sans text-xs font-black rounded-xl hover:bg-primary/90 transition shadow-pop"
          >
            Back to editing
          </button>
        </div>
      </div>
    </div>
  );
}
