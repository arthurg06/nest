// Places and areas used by the outing planner.
//
// Design notes:
// - Location is expressed as a Madrid AREA (neighbourhood), never as a precise
//   user position. Members never share their own location with each other;
//   the optional "near me" sorting happens in the browser and its result is
//   only an ordering of these public areas.
// - The seed list below is a small starting set of well-known public places.
//   It is deliberately short: members extend it through the City Guide, and
//   anyone can type a custom place, which is what real plans usually need.

export type ActivityId = "coffee" | "study" | "walk" | "food" | "move" | "culture" | "shopping";

export interface Activity {
  id: ActivityId;
  label: string;
  emoji: string;
  /** Interest tags (from the profile taxonomy) that suggest this activity. */
  interests: string[];
}

export const ACTIVITIES: Activity[] = [
  { id: "coffee", label: "Coffee", emoji: "☕", interests: ["cafes", "brunch", "coffee"] },
  { id: "study", label: "Study", emoji: "📚", interests: ["study sessions", "reading", "studying"] },
  { id: "walk", label: "Walk", emoji: "🌳", interests: ["parks", "city exploring", "picnics", "walking"] },
  { id: "food", label: "Eat", emoji: "🍽️", interests: ["foodie", "brunch", "tapas", "dinner"] },
  { id: "move", label: "Move", emoji: "🧘", interests: ["yoga", "pilates", "gym", "running", "hiking"] },
  { id: "culture", label: "Culture", emoji: "🎨", interests: ["art", "museums", "cinema", "concerts"] },
  { id: "shopping", label: "Shopping", emoji: "🛍️", interests: ["shopping", "thrifting", "vintage"] },
];

// Madrid areas. Coordinates are approximate district centres, public
// information used only to order areas by rough proximity in the browser.
export interface Area {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

export const AREAS: Area[] = [
  { id: "centro", label: "Sol / Centro", lat: 40.4168, lng: -3.7038 },
  { id: "malasana", label: "Malasaña", lat: 40.4265, lng: -3.7050 },
  { id: "chueca", label: "Chueca", lat: 40.4230, lng: -3.6960 },
  { id: "lavapies", label: "Lavapiés", lat: 40.4090, lng: -3.7000 },
  { id: "latina", label: "La Latina", lat: 40.4110, lng: -3.7100 },
  { id: "retiro", label: "Retiro", lat: 40.4130, lng: -3.6830 },
  { id: "salamanca", label: "Salamanca", lat: 40.4300, lng: -3.6800 },
  { id: "chamberi", label: "Chamberí", lat: 40.4350, lng: -3.7030 },
  { id: "moncloa", label: "Moncloa / Argüelles", lat: 40.4350, lng: -3.7200 },
];

export const areaLabel = (id: string): string => AREAS.find(a => a.id === id)?.label || id;

export interface Place {
  id: string;
  name: string;
  areaId: string;
  /** Street address as publicly listed; kept short. */
  address: string;
  activities: ActivityId[];
}

// Well-known public places, kept factual (name, area, street) with no invented
// details such as prices or opening hours.
export const SUGGESTED_PLACES: Place[] = [
  { id: "retiro-park", name: "Parque del Retiro", areaId: "retiro", address: "Plaza de la Independencia", activities: ["walk", "move", "study"] },
  { id: "federal-cafe", name: "Federal Café", areaId: "malasana", address: "Plaza de las Comendadoras, 9", activities: ["coffee", "study", "food"] },
  { id: "la-bicicleta", name: "La Bicicleta Café", areaId: "malasana", address: "Plaza de San Ildefonso, 9", activities: ["coffee", "study"] },
  { id: "toma-cafe", name: "Toma Café", areaId: "malasana", address: "Calle de la Palma, 49", activities: ["coffee"] },
  { id: "pum-pum", name: "Pum Pum Café", areaId: "lavapies", address: "Calle de Tribulete, 6", activities: ["coffee", "food"] },
  { id: "san-anton", name: "Mercado de San Antón", areaId: "chueca", address: "Calle de Augusto Figueroa, 24", activities: ["food", "shopping"] },
  { id: "el-rastro", name: "El Rastro (Sundays)", areaId: "latina", address: "Ribera de Curtidores", activities: ["shopping", "walk"] },
  { id: "reina-sofia", name: "Museo Reina Sofía", areaId: "centro", address: "Calle de Santa Isabel, 52", activities: ["culture"] },
  { id: "prado", name: "Museo del Prado", areaId: "retiro", address: "Paseo del Prado", activities: ["culture"] },
  { id: "debod", name: "Templo de Debod", areaId: "moncloa", address: "Calle de Ferraz, 1", activities: ["walk", "culture"] },
  { id: "parque-oeste", name: "Parque del Oeste", areaId: "moncloa", address: "Paseo del Pintor Rosales", activities: ["walk", "move"] },
  { id: "gran-via", name: "Gran Vía", areaId: "centro", address: "Gran Vía", activities: ["shopping", "walk"] },
  { id: "malasana-streets", name: "Malasaña (wander around)", areaId: "malasana", address: "Calle del Espíritu Santo", activities: ["walk", "shopping", "coffee"] },
  { id: "chamberi-cafes", name: "Chamberí cafés", areaId: "chamberi", address: "Calle de Fuencarral (north)", activities: ["coffee", "study", "food"] },
];

// Campus options resolve against the member's own university, so they stay
// relevant whatever she studies and require no campus database.
export const CAMPUS_PLACE_IDS = ["campus-library", "campus-cafe"] as const;

export function campusPlaces(university: string | undefined): Place[] {
  const uni = (university || "").trim();
  if (!uni) return [];
  // Phrased "<university> library" so generated titles read naturally
  // ("Coffee at Complutense café", not "Coffee at Café at Complutense").
  return [
    { id: "campus-library", name: `${uni} library`, areaId: "campus", address: "On campus", activities: ["study"] },
    { id: "campus-cafe", name: `${uni} café`, areaId: "campus", address: "On campus", activities: ["coffee", "study", "food"] },
  ];
}

// Madrid universities mapped to the area their main teaching site sits in (or
// is reached from). Unknown universities simply get no area boost.
const UNIVERSITY_AREAS: { match: string[]; areaId: string }[] = [
  { match: ["complutense", "ucm"], areaId: "moncloa" },
  { match: ["politecnica", "upm"], areaId: "moncloa" },
  { match: ["comillas", "icade"], areaId: "chamberi" },
  { match: ["ie university", "ie business", "instituto de empresa"], areaId: "salamanca" },
  { match: ["nebrija"], areaId: "chamberi" },
  { match: ["ceu", "san pablo"], areaId: "moncloa" },
  { match: ["europea", "uem"], areaId: "moncloa" },
  { match: ["autonoma", "uam"], areaId: "chamberi" },
  { match: ["carlos iii", "uc3m"], areaId: "centro" },
  { match: ["rey juan carlos", "urjc"], areaId: "centro" },
];

export function universityAreaId(university: string | undefined): string | null {
  const value = (university || "").toLowerCase();
  if (!value) return null;
  for (const entry of UNIVERSITY_AREAS) {
    if (entry.match.some(needle => value.includes(needle))) return entry.areaId;
  }
  return null;
}

// Rough great-circle distance in km; only used to order areas.
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface RankInput {
  places: Place[];
  activity?: ActivityId | null;
  /** Area of the university both members relate to, when known. */
  universityAreaId?: string | null;
  /** Optional device position — supplied by the browser, never stored. */
  origin?: { lat: number; lng: number } | null;
  query?: string;
}

// Orders places by usefulness: matching the chosen activity first, then
// proximity (device position when offered, otherwise the university area),
// keeping campus options at the top since they are always relevant.
export function rankPlaces({ places, activity, universityAreaId, origin, query }: RankInput): Place[] {
  const needle = (query || "").trim().toLowerCase();

  const filtered = places.filter(place => {
    if (needle && !`${place.name} ${place.address}`.toLowerCase().includes(needle)) return false;
    if (activity && !place.activities.includes(activity)) return false;
    return true;
  });

  const areaById = new Map(AREAS.map(a => [a.id, a]));

  const score = (place: Place): number => {
    if (place.areaId === "campus") return -100; // always first
    const area = areaById.get(place.areaId);
    if (!area) return 50;
    if (origin) return distanceKm(origin, area);
    if (universityAreaId) {
      if (place.areaId === universityAreaId) return 0;
      const uniArea = areaById.get(universityAreaId);
      if (uniArea) return distanceKm(uniArea, area);
    }
    return 10;
  };

  return [...filtered].sort((a, b) => score(a) - score(b));
}

export function planTitle(activity: ActivityId | null, placeName: string): string {
  const found = ACTIVITIES.find(a => a.id === activity);
  if (!found) return `Meet at ${placeName}`;
  switch (found.id) {
    case "coffee": return `Coffee at ${placeName}`;
    case "study": return `Study session at ${placeName}`;
    case "walk": return `Walk at ${placeName}`;
    case "food": return `Food at ${placeName}`;
    case "move": return `Workout at ${placeName}`;
    case "culture": return `Culture trip to ${placeName}`;
    case "shopping": return `Shopping at ${placeName}`;
    default: return `Meet at ${placeName}`;
  }
}
