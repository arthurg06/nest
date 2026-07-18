import { MapSpot } from "./types";

// Interest options and compatibility scoring are shared with the server.
export { PREDEFINED_INTEREST_OPTIONS, calculateCompatibility } from "../shared/compatibility";

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
