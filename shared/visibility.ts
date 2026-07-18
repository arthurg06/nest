// What another member is allowed to see of a profile — in one place, so the
// server and the in-app preview can never disagree.
//
// The preview screen shows a member her own card "as others see it". If it
// derived its own idea of what is hidden, the two would drift apart the first
// time a field was added, and the preview would start promising privacy the
// server does not actually give her. Both sides call profileFor().

/** Owner-and-admins only: the verification record holds her university email. */
export const PRIVATE_FIELDS = ["verification"] as const;

/**
 * Shared only once two members have matched. Handles are the highest-value
 * scraping target on a women-only app, so they are not part of the open deck.
 */
export const MATCH_ONLY_FIELDS = ["instagram", "tiktok", "otherSocial"] as const;

/** Who is looking: any member browsing the deck, or someone she matched with. */
export type Audience = "everyone" | "match";

/** The fields hidden from a given audience. */
export function hiddenFrom(audience: Audience): readonly string[] {
  return audience === "match"
    ? PRIVATE_FIELDS
    : [...PRIVATE_FIELDS, ...MATCH_ONLY_FIELDS];
}

/** A copy of the profile with everything this audience may not see removed. */
export function profileFor<T extends Record<string, any>>(profile: T, audience: Audience): Partial<T> {
  const visible: Partial<T> = { ...profile };
  for (const field of hiddenFrom(audience)) {
    delete visible[field as keyof T];
  }
  return visible;
}
