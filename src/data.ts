import { UserProfile, Interests, MapSpot, Recommendation, Event } from "./types";

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
  ]
};

// Calculate compatibility rating and returns details between two profiles
export function calculateCompatibility(user: UserProfile, match: UserProfile) {
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

// Map spots for Madrid custom map
export const MADRID_MAP_SPOTS: MapSpot[] = [
  {
    id: "retiro",
    name: "Parque del Buen Retiro",
    category: "activity",
    description: "The crown jewel of Madrid's parks. Perfect for a cozy picnic, outdoor yoga, reading, or rowing a boat on the lake.",
    address: "Plaza de la Independencia, 7",
    lat: 55,
    lng: 75,
    icon: "Tree",
    bestFor: ["parks", "picnics", "yoga", "pilates", "running", "hiking", "reading"]
  },
  {
    id: "federal",
    name: "Federal Café",
    category: "cafe",
    description: "Extremely popular Aussie brunch café in Madrid. Great vibe, amazing pancakes, and highly laptop-friendly for study sessions.",
    address: "Plaza de las Comendadoras, 9",
    lat: 32,
    lng: 35,
    icon: "Coffee",
    bestFor: ["cafes", "brunch", "study sessions", "reading"]
  },
  {
    id: "rastro",
    name: "El Rastro Flea Market",
    category: "hidden_gem",
    description: "Every Sunday, La Latina transforms into a massive vintage clothing and thrifting haven. Perfect Sunday girls-outing!",
    address: "Calle de la Ribera de Curtidores",
    lat: 70,
    lng: 40,
    icon: "Sparkles",
    bestFor: ["thrifting", "shopping", "city exploring", "spontaneous"]
  },
  {
    id: "pum_pum",
    name: "Pum Pum Café",
    category: "cafe",
    description: "Trendy, industrial-rustic bakery and cafe in Lavapiés known for incredible sourdough, avocado toasts, and organic coffee.",
    address: "Calle de Tribulete, 6",
    lat: 78,
    lng: 50,
    icon: "Coffee",
    bestFor: ["cafes", "brunch", "foodie", "wellness"]
  },
  {
    id: "reina_sofia",
    name: "Museo Nacional Reina Sofía",
    category: "activity",
    description: "Madrid's modern art sanctuary. Home to Picasso's masterpieces and gorgeous garden courtyards.",
    address: "Calle de Santa Isabel, 52",
    lat: 82,
    lng: 60,
    icon: "Compass",
    bestFor: ["museums", "art", "creative", "city exploring"]
  },
  {
    id: "bicicleta",
    name: "La Bicicleta Café",
    category: "study",
    description: "The ultimate 'work cafe' in Malasaña. Cozy couches, high-speed WiFi, study desks, and delicious craft beer for after-hours.",
    address: "Plaza de San Ildefonso, 9",
    lat: 38,
    lng: 48,
    icon: "BookOpen",
    bestFor: ["study sessions", "cafes", "reading", "creative"]
  },
  {
    id: "debod",
    name: "Templo de Debod",
    category: "hidden_gem",
    description: "An authentic ancient Egyptian temple rebuilt in Madrid. Offers the absolute best sunset view in the city over the western hills.",
    address: "Calle de Ferraz, 1",
    lat: 35,
    lng: 15,
    icon: "Sparkles",
    bestFor: ["parks", "picnics", "city exploring", "spontaneous", "photography"]
  },
  {
    id: "sala_equis",
    name: "Sala Equis",
    category: "restaurant",
    description: "A repurposed old adult cinema turned into a stunning cocktail and movie bar. Indoor trees, swings, and incredible aesthetic vibes.",
    address: "Calle del Duque de Alba, 4",
    lat: 68,
    lng: 47,
    icon: "Wine",
    bestFor: ["cocktail bars", "wine nights", "movie nights", "nightlife", "luxury"]
  },
  {
    id: "plaza_mayor",
    name: "Plaza Mayor Landmark",
    category: "landmark",
    description: "The historic central plaza of Madrid. Surrounded by gorgeous red apartments, cafes, and perfect for people-watching.",
    address: "Plaza Mayor, 28012",
    lat: 58,
    lng: 44,
    icon: "MapPin",
    bestFor: ["city exploring", "restaurants", "travel"]
  }
];
