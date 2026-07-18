import fs from "fs";
import path from "path";
import { normalizeStoredNationalities } from "../shared/countries.js";

// Vercel's deployment filesystem is read-only; /tmp is the only writable
// location there (ephemeral — data resets between cold starts). Self-hosted
// installs keep the database at the project root, or wherever DB_PATH points.
const DB_FILE =
  process.env.DB_PATH ||
  (process.env.VERCEL ? "/tmp/db.json" : path.join(process.cwd(), "db.json"));

export type UserRole = "admin" | "member";
export type AccountStatus = "active" | "suspended";
// Where the account was created. Extensible for future clients
// (e.g. "ios", "android", "admin_created"); only "web" is issued today.
export type AccountSource = "web" | "ios" | "android" | "admin_created";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  /** Derived from role — kept for backward compatibility with older clients. */
  isAdmin: boolean;
  role: UserRole;
  status: AccountStatus;
  source: AccountSource;
  isPremium: boolean;
  premiumExpiresAt?: string;
  /** Stripe linkage — set exclusively by server-side Stripe flows/webhooks. */
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: string;
  lastActiveAt?: string;
  createdAt: string;
}

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
  /** Free-text context provided by the member. */
  userNote?: string;
  submittedAt?: string;
  reviewedAt?: string;
  /** Admin user ID — internal, never sent to the member. */
  reviewedById?: string;
  /** Shown to the member when rejected. */
  rejectionReason?: string;
  /** Internal admin note — never sent to the member. */
  adminNote?: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  name: string;
  age: number;
  nationality: string; // comma-separated if multiple
  university: string;
  currentCity: string;
  languages: string[]; // e.g., ["English (Native)", "Spanish (Conversational)"]
  personalityType: string;
  friendshipType: string;
  bio: string;
  interests: Interests;
  /** Derived: verificationStatus === "approved". Kept for compatibility. */
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  verification?: VerificationInfo;
  avatarSeed: string;
  avatarColor: string;
  photo: string;
  tiktok?: string;
  instagram?: string;
  otherSocial?: string;
  createdAt: string;
}

export interface AdminAuditEntry {
  id: string;
  adminId: string;
  action: string;
  targetUserId?: string;
  detail?: string;
  createdAt: string;
}

export interface Swipe {
  id: string;
  fromUserId: string;
  toUserId: string;
  action: "like" | "dislike";
  createdAt: string;
}

export interface Match {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: string;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string; // userId of sender
  text: string;
  timestamp: string; // ISO string
  createdAt: string;
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
  authorAvatarSeed: string;
  authorAvatarColor: string;
  authorId: string; // userId who added it
  likes: number;
  likedBy: string[]; // userIds who liked
  images?: string[]; // Multiple uploaded image URLs
  imageUrl?: string; // Optional venue or spot image URL
  googleMapsUrl?: string; // Official Google Maps Link
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: "social" | "culture" | "study" | "wellness";
  imageSeed: string;
  organizer: string;
  price: string;
  maxParticipants?: number;
  createdAt: string;
}

export interface EventRsvp {
  id: string;
  eventId: string;
  userId: string;
  createdAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarSeed: string;
  authorAvatarColor: string;
  authorUni: string;
  text: string;
  imageUrl?: string;
  likes: number;
  likedBy: string[]; // userIds
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  text: string;
  timestamp: string;
  read: boolean;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: string;
}

export interface DbSchema {
  users: User[];
  profiles: UserProfile[];
  swipes: Swipe[];
  matches: Match[];
  messages: Message[];
  recommendations: Recommendation[];
  events: Event[];
  rsvps: EventRsvp[];
  posts: Post[];
  notifications: Notification[];
  sessions: Session[];
  adminAudit: AdminAuditEntry[];
  /** Processed Stripe webhook event IDs (idempotency guard, capped). */
  processedStripeEvents: string[];
}

const initialDb: DbSchema = {
  users: [],
  profiles: [],
  swipes: [],
  matches: [],
  messages: [],
  recommendations: [],
  events: [],
  rsvps: [],
  posts: [],
  notifications: [],
  sessions: [],
  adminAudit: [],
  processedStripeEvents: [],
};

// Fills in fields introduced after the prototype era so records written by
// older code keep working. Idempotent; returns true when anything changed.
function migrateDb(db: DbSchema): boolean {
  let changed = false;

  if (!Array.isArray(db.adminAudit)) {
    db.adminAudit = [];
    changed = true;
  }

  if (!Array.isArray(db.processedStripeEvents)) {
    db.processedStripeEvents = [];
    changed = true;
  }

  for (const user of db.users) {
    if (!user.role) {
      user.role = user.isAdmin ? "admin" : "member";
      changed = true;
    }
    if (user.isAdmin !== (user.role === "admin")) {
      user.isAdmin = user.role === "admin";
      changed = true;
    }
    if (!user.status) {
      user.status = "active";
      changed = true;
    }
    if (!user.source) {
      user.source = "web";
      changed = true;
    }
  }

  for (const profile of db.profiles) {
    if (!profile.verificationStatus) {
      profile.verificationStatus = profile.isVerified ? "approved" : "unsubmitted";
      changed = true;
    }
    const shouldBeVerified = profile.verificationStatus === "approved";
    if (profile.isVerified !== shouldBeVerified) {
      profile.isVerified = shouldBeVerified;
      changed = true;
    }

    // Migrate legacy country names ("Korea, South", "Turkey", …) to the
    // canonical dataset; unknown values pass through untouched.
    if (profile.nationality) {
      const normalized = normalizeStoredNationalities(profile.nationality);
      if (normalized !== profile.nationality) {
        profile.nationality = normalized;
        changed = true;
      }
    }
  }

  return changed;
}

// Helper to load db
export function readDb(): DbSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf-8");
      return structuredClone(initialDb);
    }
    const content = fs.readFileSync(DB_FILE, "utf-8");
    const db = JSON.parse(content) as DbSchema;
    if (migrateDb(db)) {
      writeDb(db);
    }
    return db;
  } catch (error) {
    console.error("Error reading database file, returning default:", error);
    return structuredClone(initialDb);
  }
}

// Helper to save db atomically
export function writeDb(data: DbSchema): void {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempFile, DB_FILE);
  } catch (error) {
    console.error("Error writing database file:", error);
  }
}
