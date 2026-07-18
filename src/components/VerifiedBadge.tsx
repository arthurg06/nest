import React from "react";
import { BadgeCheck } from "lucide-react";
import { UserProfile } from "../types";

interface VerifiedBadgeProps {
  profile: Pick<UserProfile, "verificationStatus"> | null | undefined;
  className?: string;
}

// Compact green "Verified Student" badge shown beside a member's identity.
// Renders ONLY for an admin-approved verification status — the authoritative
// server-driven field, never a client-controlled boolean. Green success
// tokens keep verification visually distinct from the pink primary color.
export default function VerifiedBadge({ profile, className = "" }: VerifiedBadgeProps) {
  if (profile?.verificationStatus !== "approved") return null;

  return (
    <span
      className={`inline-flex items-center gap-1 bg-success-muted text-success border border-success-border rounded-full px-2 py-0.5 text-[11px] font-sans font-bold leading-none whitespace-nowrap align-middle ${className}`}
    >
      <BadgeCheck size={12} aria-hidden="true" className="shrink-0" />
      <span>Verified Student</span>
    </span>
  );
}
