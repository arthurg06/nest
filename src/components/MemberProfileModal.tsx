import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { UserProfile } from "../types";
import SwipeCard from "./SwipeCard";
import { ArrowLeft } from "lucide-react";

interface MemberProfileModalProps {
  profile: UserProfile;
  /** Pass the viewer to show a real match score; omit it (admin) for "—". */
  currentUser?: UserProfile;
  onClose: () => void;
}

// Full-screen viewer for another member's profile — from a chat header or the
// admin member list. The card is rendered by SwipeCard, the exact component
// the deck uses, in preview mode (inert like/pass), so there is no second
// profile design to drift out of sync.
//
// Rendered through a portal to <body>: a transformed or filtered ancestor
// (animation fill states, motion wrappers, backdrop-blur panels) would
// otherwise become the containing block for this fixed overlay and pin it to
// that container instead of the viewport.
export default function MemberProfileModal({ profile, currentUser, onClose }: MemberProfileModalProps) {
  // The page behind keeps its exact scroll position: background scrolling is
  // frozen while the profile is open, so closing returns the caller (e.g. the
  // admin member list) to precisely where she was.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] bg-background flex flex-col animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`${profile.name}'s profile`}
    >
      <div className="w-full max-w-md mx-auto h-full flex flex-col px-4">
        <div className="shrink-0 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-foreground hover:text-primary font-sans text-xs font-bold px-2 py-2 -mx-2 cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-6">
          <SwipeCard profile={profile} currentUser={currentUser} preview expanded />
        </div>
      </div>
    </div>,
    document.body
  );
}
