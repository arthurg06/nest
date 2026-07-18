// The initials badge on a profile card is painted with a Tailwind gradient,
// so avatarColor has to hold a pair of gradient utility classes.
//
// Accounts created before this was settled stored a random hex string
// ("#3f9a2b") instead. Tailwind ignores it, `bg-gradient-to-tr` is left with
// no colour stops, and the badge renders transparent — white initials on
// whatever the photo happens to be. avatarGradient() maps anything unusable
// onto a stable palette entry derived from the seed, so those accounts repair
// themselves on sight and a member's colour never changes between sessions.

export const AVATAR_GRADIENTS = [
  "from-rose-400 to-rose-600",
  "from-amber-400 to-orange-500",
  "from-fuchsia-400 to-purple-500",
  "from-sky-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-orange-300 to-rose-400",
  "from-violet-400 to-fuchsia-500",
  "from-teal-400 to-cyan-500"
];

/** The gradient classes to paint this profile's badge with. Never empty. */
export function avatarGradient(source: { avatarColor?: string; avatarSeed?: string; name?: string }): string {
  const stored = source.avatarColor?.trim();
  if (stored && stored.includes("from-")) return stored;

  const seed = source.avatarSeed || source.name || "";
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}
