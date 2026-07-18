// Shared between the React frontend and the Express server so both compute
// the same, stable compatibility score for a pair of profiles.

export const PREDEFINED_INTEREST_OPTIONS = {
  activities: [
    "gym", "yoga", "pilates", "dance", "running", "hiking", "reading", "cooking",
    "baking", "art", "photography", "videography", "fashion", "beauty",
    "skincare", "interior design", "journaling", "learning languages", "gaming"
  ],
  music: [
    "house music", "techno", "electronic", "reggaeton", "afrobeats", "brazilian funk",
    "jazz", "rap", "hip-hop", "pop", "r&b", "country", "indie", "rock",
    "latin music", "k-pop"
  ],
  social: [
    "cafes", "brunch", "picnics", "parks", "restaurants", "wine nights",
    "cocktail bars", "clubbing", "house parties", "concerts", "festivals",
    "shopping", "thifting", "beach", "travel", "city exploring", "museums",
    "study sessions", "movie nights"
  ],
  lifestyle: [
    "wellness", "luxury", "nightlife", "foodie", "creative", "entrepreneur",
    "fashion girl", "homebody", "adventure seeker", "spontaneous", "planner",
    "morning person", "night owl"
  ],
  spendingStyle: [
    "budget queen", "middle range baddie", "high spender", "luxury lover"
  ],
  // Single choice, like spendingStyle. Empty means "not said".
  animals: [
    "dog lover", "cat lover", "loves all animals", "plants over pets"
  ]
};

export const ANIMAL_EMOJI: Record<string, string> = {
  "dog lover": "🐶",
  "cat lover": "🐱",
  "loves all animals": "🐾",
  "plants over pets": "🪴"
};

export interface CompatibilityInterests {
  activities: string[];
  music: string[];
  social: string[];
  lifestyle: string[];
  spendingStyle: string;
  animals?: string;
}

export interface CompatibilityProfile {
  interests: CompatibilityInterests;
  languages: string[];
  university: string;
}

export interface CompatibilityReport {
  score: number;
  sharedInterests: string[];
  sharedLanguages: string[];
  matchingVibes: string[];
  explanation: string;
}

// Deterministic compatibility rating between two profiles (60–98).
export function calculateCompatibility(user: CompatibilityProfile, match: CompatibilityProfile): CompatibilityReport {
  let score = 65; // Base compatibility

  const sharedActivities = user.interests.activities.filter(a => match.interests.activities.includes(a));
  const sharedMusic = user.interests.music.filter(m => match.interests.music.includes(m));
  const sharedSocial = user.interests.social.filter(s => match.interests.social.includes(s));
  const sharedLifestyle = user.interests.lifestyle.filter(l => match.interests.lifestyle.includes(l));

  const totalSharedCount = sharedActivities.length + sharedMusic.length + sharedSocial.length + sharedLifestyle.length;
  score += totalSharedCount * 1.5;

  if (user.interests.spendingStyle === match.interests.spendingStyle) {
    score += 8;
  } else {
    const index1 = PREDEFINED_INTEREST_OPTIONS.spendingStyle.indexOf(user.interests.spendingStyle);
    const index2 = PREDEFINED_INTEREST_OPTIONS.spendingStyle.indexOf(match.interests.spendingStyle);
    if (Math.abs(index1 - index2) === 1) {
      score += 4;
    }
  }

  // Sharing an animal preference is a small, concrete thing to talk about.
  if (user.interests.animals && user.interests.animals === match.interests.animals) {
    score += 5;
  }

  const sharedLanguages = user.languages.filter(l => match.languages.includes(l));
  score += sharedLanguages.length * 2;

  if (user.university && match.university && user.university.toLowerCase() === match.university.toLowerCase()) {
    score += 10;
  }

  score = Math.min(98, Math.max(60, Math.round(score)));

  const allSharedInterests = [...sharedActivities, ...sharedMusic, ...sharedSocial];
  const matchingVibes = [...sharedLifestyle];
  if (user.interests.spendingStyle === match.interests.spendingStyle) {
    matchingVibes.push(user.interests.spendingStyle);
  }
  if (user.interests.animals && user.interests.animals === match.interests.animals) {
    matchingVibes.push(user.interests.animals);
  }

  let explanation = "";
  if (user.university && match.university && user.university.toLowerCase() === match.university.toLowerCase()) {
    explanation = `You both study at ${user.university} and share interests like ${allSharedInterests.slice(0, 2).join(" & ")}.`;
  } else if (allSharedInterests.length > 0) {
    explanation = `High overlap in social plans! You both love ${allSharedInterests.slice(0, 3).join(", ")}.`;
  } else if (matchingVibes.length > 0) {
    explanation = `You share a similar lifestyle vibe as you are both "${matchingVibes[0]}" and speak ${sharedLanguages[0] || "English"}.`;
  } else {
    explanation = `You are both international students in Madrid looking for friendship and deep conversations.`;
  }

  return {
    score,
    sharedInterests: allSharedInterests,
    sharedLanguages,
    matchingVibes,
    explanation
  };
}
