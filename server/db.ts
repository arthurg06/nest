import { normalizeStoredNationalities } from "../shared/countries.js";
import { selectBackend } from "./storage/index.js";

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
  /** "dog lover" | "cat lover" | "loves all animals" | "plants over pets" */
  animals?: string;
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
  /** Primary photo — always mirrors photos[0]. */
  photo: string;
  /** Up to 4 photos, primary first. */
  photos?: string[];
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
  /** Set when the message carries an outing proposal card. */
  planId?: string;
  timestamp: string; // ISO string
  createdAt: string;
}

export type PlanStatus = "pending" | "accepted" | "declined";

/** An outing two matched members agree on: what, where, when. */
export interface Plan {
  id: string;
  matchId: string;
  senderId: string;
  receiverId: string;
  /** Closed vocabulary from shared/places.ts (coffee, study, walk, …). */
  activity: string;
  title: string;
  placeName: string;
  /** Neighbourhood label — never a precise position. */
  placeArea?: string;
  placeAddress?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  note?: string;
  status: PlanStatus;
  createdAt: string;
  respondedAt?: string;
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
  plans: Plan[];
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
  plans: [],
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

  if (!Array.isArray(db.plans)) {
    db.plans = [];
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

    // Profiles created before multi-photo support carry a single photo;
    // seed the gallery from it so both fields always agree.
    if (!Array.isArray(profile.photos)) {
      profile.photos = profile.photo ? [profile.photo] : [];
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

// Optional bootstrap for ephemeral deployments (e.g. Vercel, where /tmp
// resets between cold starts): DB_SEED holds base64-encoded JSON with a
// partial DbSchema — typically one admin user (scrypt password hash only,
// never plain text) plus her profile — used to hydrate a missing database
// file. Sessions are deliberately never seeded.
function seedFromEnv(): DbSchema | null {
  const raw = process.env.DB_SEED;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
    const db = structuredClone(initialDb);
    for (const key of Object.keys(db) as (keyof DbSchema)[]) {
      if (key === "sessions") continue;
      if (Array.isArray(parsed[key])) {
        (db[key] as unknown[]) = parsed[key];
      }
    }
    return db;
  } catch (error) {
    console.error("Invalid DB_SEED value — starting with an empty database:", error);
    return null;
  }
}

// Baseline snapshots captured at read time let row-level backends persist
// only what a request actually changed (keyed by object identity, so
// concurrent requests in one process never share a baseline).
const baselines = new WeakMap<DbSchema, DbSchema>();

// Load the database. A store that has never been written is hydrated from
// DB_SEED (or starts empty) and persisted, so the seed applies at most once
// per store lifetime — reseeding a persistent database is impossible.
export async function readDb(): Promise<DbSchema> {
  const backend = selectBackend();

  let db = await backend.load();
  if (!db) {
    db = seedFromEnv() ?? structuredClone(initialDb);
    migrateDb(db);
    await backend.persist(null, db);
  } else {
    const beforeMigration = structuredClone(db);
    if (migrateDb(db)) {
      await backend.persist(beforeMigration, db);
    }
  }

  baselines.set(db, structuredClone(db));
  return db;
}

// Persist a snapshot previously obtained from readDb. Errors propagate to
// the caller — a request must never report success for data that was not
// durably written.
export async function writeDb(data: DbSchema): Promise<void> {
  const backend = selectBackend();
  const prev = baselines.get(data) ?? null;
  if (!prev) {
    console.warn("writeDb called without a read baseline — performing a full sync");
  }
  await backend.persist(prev, data);
  baselines.set(data, structuredClone(data));
}
