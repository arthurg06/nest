export interface Interests {
  activities: string[];
  music: string[];
  social: string[];
  lifestyle: string[];
  spendingStyle: string; // "budget queen" | "middle range baddie" | "high spender" | "luxury lover"
}

export type VerificationStatus = "unsubmitted" | "pending" | "approved" | "rejected";

export interface VerificationInfo {
  university?: string;
  universityEmail?: string;
  userNote?: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface UserProfile {
  id: string;
  userId?: string;
  name: string;
  age: number;
  nationality: string;
  university: string;
  currentCity: string;
  languages: string[];
  personalityType?: string; // e.g. "ENFP", "INFJ"
  friendshipType: string; // e.g. "adventure buddy", "study partner", "soul sisters", "spontaneous partner"
  bio: string;
  interests: Interests;
  isVerified: boolean;
  verificationStatus?: VerificationStatus;
  verification?: VerificationInfo;
  avatarSeed: string; // Seed to generate or load a beautiful avatar
  avatarColor: string; // Color palette for avatar
  photo: string; // Required profile photo URL
  tiktok?: string; // Optional TikTok handle
  instagram?: string; // Optional Instagram handle
  otherSocial?: string; // Optional other social handles
}

export interface Message {
  id: string;
  senderId: string; // "me" or matching user id
  text: string;
  timestamp: string; // ISO string or short time like "14:32"
  planId?: string; // Reference to a scheduled plan
}

export interface Match {
  id: string; // Match user profile ID
  profile: UserProfile;
  timestamp: string;
  messages: Message[];
  /** Outing proposals exchanged in this chat (server-provided). */
  plans?: Plan[];
  compatibilityRating: number; // 0 to 100
  compatibilityReport: {
    sharedInterests: string[];
    sharedLanguages: string[];
    matchingVibes: string[];
    explanation: string;
  };
}

export interface CommunityMessage {
  id: string;
  senderName: string;
  senderAvatarSeed: string;
  senderAvatarColor: string;
  senderUni: string;
  text: string;
  timestamp: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  category: "all" | "university" | "interests" | "nationality";
  membersCount: number;
  messages: CommunityMessage[];
  lastMessageText?: string;
  lastMessageTime?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string; // e.g., "Saturday, July 18"
  time: string; // e.g., "15:00"
  location: string;
  category: "social" | "culture" | "study" | "wellness";
  imageSeed: string;
  organizer: string;
  rsvpsCount: number;
  userRsvped: boolean;
  price: string; // e.g., "Free" or "€5"
  maxParticipants?: number; // Maximum amount of people (for study sessions, etc)
}

export interface Recommendation {
  id: string;
  name: string;
  category: "cafe" | "restaurant" | "study" | "activity" | "hidden_gem";
  description: string;
  rating: number;
  userTags: string[];
  address: string;
  locationCoords: { lat: number; lng: number };
  authorName: string;
  authorId?: string;
  authorAvatarSeed: string;
  authorAvatarColor: string;
  likes: number;
  userLiked?: boolean;
  imageUrl?: string; // Optional venue or spot image URL
  images?: string[]; // Multiple uploaded image URLs
  googleMapsUrl?: string; // Official Google Maps Link
}

export interface Plan {
  id: string;
  matchId: string;
  senderId: string;
  receiverId: string;
  activity: string;
  title: string;
  placeName: string;
  placeArea?: string;
  placeAddress?: string;
  date: string;
  time: string;
  note?: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  respondedAt?: string;
}
