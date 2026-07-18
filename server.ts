import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { User, UserProfile, Swipe, Match, Message, Recommendation, Event, EventRsvp, Post, Notification, Session, DbSchema } from "./server/db.js";

// Note: we can import from "./server/db.ts" but since esbuild bundles it, we can write import with relative path
// and typescript handles resolution. In Node, with esbuild bundle, we should import './server/db' without extension or let esbuild resolve it.
import * as dbManager from "./server/db.js";
import { calculateCompatibility } from "./shared/compatibility.js";
import { hashPassword, verifyPassword, isHashedPassword, generateSessionToken, generateSecureId, sniffImageType } from "./server/security.js";
import { RateLimiter } from "./server/rateLimit.js";
import { getStripe, isStripeConfigured, isWebhookConfigured, premiumPriceId } from "./server/stripe.js";
import { saveImage, deleteImage } from "./server/images.js";
import { PREMIUM_PLAN, PREMIUM_PRICE_LABEL } from "./shared/subscription.js";

dotenv.config({ quiet: true });

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Emails listed in ADMIN_EMAILS (comma-separated) are granted the admin role
// at sign-up and on login. Configured via environment so no personal data
// lives in the codebase.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);
const isAdminEmail = (email: string) => ADMIN_EMAILS.includes(email.toLowerCase());

// A member's own profile: verification info visible minus internal-only
// fields (admin notes, reviewer identity).
function ownProfileView(profile: UserProfile) {
  if (!profile.verification) return profile;
  const { adminNote, reviewedById, ...visible } = profile.verification;
  return { ...profile, verification: visible };
}

// A profile as shown to OTHER members: no verification record at all.
function publicProfileView(profile: UserProfile) {
  const { verification, ...rest } = profile;
  return rest;
}

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").slice(0, 50) : [];

function sanitizeInterests(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  return {
    activities: asStringArray(value.activities),
    music: asStringArray(value.music),
    social: asStringArray(value.social),
    lifestyle: asStringArray(value.lifestyle),
    spendingStyle: typeof value.spendingStyle === "string" ? value.spendingStyle : "middle range baddie"
  };
}

// Server-side Premium entitlement — driven by Stripe webhook state (or a
// still-valid paid period), never by client-side flags.
function hasActiveSubscription(user: User): boolean {
  if (user.subscriptionStatus === "active" || user.subscriptionStatus === "trialing") return true;
  if (user.premiumExpiresAt && new Date(user.premiumExpiresAt).getTime() > Date.now()) return true;
  return false;
}

function appBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${PORT}`;
}

// Best-effort cancellation when an account is deleted so no one keeps being
// billed for a deleted profile. Failures are logged, never block deletion.
async function cancelStripeSubscriptionSafely(user: User): Promise<void> {
  const stripe = getStripe();
  if (!stripe || !user.stripeSubscriptionId) return;
  try {
    await stripe.subscriptions.cancel(user.stripeSubscriptionId);
  } catch (err) {
    console.error("Could not cancel Stripe subscription during account deletion:", err);
  }
}

// Append-only audit trail for admin decisions. Never contains passwords,
// tokens, or payment data.
function recordAudit(db: DbSchema, adminId: string, action: string, targetUserId?: string, detail?: string) {
  db.adminAudit.push({
    id: generateId(),
    adminId,
    action,
    targetUserId,
    detail,
    createdAt: new Date().toISOString()
  });
}

// Vercel's deployment filesystem is read-only; /tmp is the only writable
// location there (ephemeral — files reset between cold starts).
const UPLOAD_DIR =
  process.env.UPLOAD_DIR ||
  (process.env.VERCEL ? "/tmp/uploads" : path.join(process.cwd(), "uploads"));

// ----------------------------------------------------
// STRIPE WEBHOOK (registered BEFORE the JSON body parser — Stripe signature
// verification requires the raw request body)
// ----------------------------------------------------
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return res.status(503).json({ error: "Stripe webhooks are not configured" });
  }

  let event;
  try {
    const signature = req.headers["stripe-signature"] as string;
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return res.status(400).json({ error: "Invalid signature" });
  }

  try {
    const db = await dbManager.readDb();

    // Idempotency: each Stripe event is applied at most once.
    if (db.processedStripeEvents.includes(event.id)) {
      return res.json({ received: true, duplicate: true });
    }
    db.processedStripeEvents.push(event.id);
    if (db.processedStripeEvents.length > 1000) {
      db.processedStripeEvents = db.processedStripeEvents.slice(-1000);
    }

    // Resolve the affected user from trusted webhook data only (customer ID
    // stored server-side, or the checkout session's client_reference_id).
    const findUserForCustomer = (customerId: string | null | undefined, fallbackUserId?: string | null) => {
      if (customerId) {
        const byCustomer = db.users.find(u => u.stripeCustomerId === customerId);
        if (byCustomer) return byCustomer;
      }
      if (fallbackUserId) {
        return db.users.find(u => u.id === fallbackUserId);
      }
      return undefined;
    };

    // Subscriptions in these states grant entitlement
    const grantsAccess = (status: string) => status === "active" || status === "trialing";

    // Stripe moved current_period_end onto subscription items in newer API
    // versions; support both shapes.
    const periodEndOf = (sub: any): string | undefined => {
      const ts = sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end;
      return typeof ts === "number" ? new Date(ts * 1000).toISOString() : undefined;
    };

    const pushNotification = (userId: string, text: string) => {
      db.notifications.push({
        id: generateId(),
        userId,
        text,
        timestamp: new Date().toISOString(),
        read: false,
        createdAt: new Date().toISOString()
      });
    };

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const user = findUserForCustomer(
          typeof session.customer === "string" ? session.customer : session.customer?.id,
          session.client_reference_id || session.metadata?.userId
        );
        if (user) {
          if (typeof session.customer === "string") user.stripeCustomerId = session.customer;
          if (typeof session.subscription === "string") user.stripeSubscriptionId = session.subscription;
          user.subscriptionStatus = "active";
          user.isPremium = true;
          pushNotification(user.id, `Welcome to ${PREMIUM_PLAN.name}! Your membership is active — you can now RSVP to official outings.`);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as any;
        const user = findUserForCustomer(typeof sub.customer === "string" ? sub.customer : sub.customer?.id);
        if (user) {
          user.stripeSubscriptionId = sub.id;
          user.subscriptionStatus = sub.status;
          const periodEnd = periodEndOf(sub);
          if (periodEnd) user.premiumExpiresAt = periodEnd;
          user.isPremium = grantsAccess(sub.status);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        const user = findUserForCustomer(typeof sub.customer === "string" ? sub.customer : sub.customer?.id);
        if (user) {
          user.subscriptionStatus = "canceled";
          user.isPremium = false;
          const periodEnd = periodEndOf(sub);
          user.premiumExpiresAt = periodEnd || new Date().toISOString();
          pushNotification(user.id, "Your NEST Premium membership has ended. You can rejoin anytime from the Events tab.");
        }
        break;
      }

      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        const user = findUserForCustomer(typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id);
        if (user) {
          user.subscriptionStatus = "active";
          user.isPremium = true;
          const periodEnd = invoice.lines?.data?.[0]?.period?.end;
          if (typeof periodEnd === "number") {
            user.premiumExpiresAt = new Date(periodEnd * 1000).toISOString();
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const user = findUserForCustomer(typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id);
        if (user) {
          user.subscriptionStatus = "past_due";
          pushNotification(user.id, "Your NEST Premium payment failed. Please update your payment method to keep your membership active.");
        }
        break;
      }

      default:
        // Unhandled event types are acknowledged without changes.
        break;
    }

    await dbManager.writeDb(db);
    res.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// 12 MB accommodates the 8 MB image cap after base64 encoding (~10.7 MB).
app.use(express.json({ limit: "12mb" }));
app.use("/uploads", express.static(UPLOAD_DIR));

// Cryptographically secure entity IDs
const generateId = () => generateSecureId();

// ----------------------------------------------------
// RATE LIMITING (disabled in tests for determinism)
// ----------------------------------------------------
const isTestEnv = process.env.NODE_ENV === "test";
const loginLimiter = new RateLimiter(10, 15 * 60 * 1000);   // 10 attempts / 15 min / IP+email
const signupLimiter = new RateLimiter(10, 60 * 60 * 1000);  // 10 accounts / hour / IP
const uploadLimiter = new RateLimiter(30, 60 * 60 * 1000);  // 30 uploads / hour / IP

function clientIp(req: express.Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

// Authentication Middleware. Async (storage may be remote); Express 4 does
// not catch async errors, so the body is fully wrapped.
async function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }
    const token = authHeader.substring(7);
    const db = await dbManager.readDb();
    const session = db.sessions.find(s => s.token === token);

    if (!session) {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    if (new Date(session.expiresAt) < new Date()) {
      // Clear expired session
      db.sessions = db.sessions.filter(s => s.token !== token);
      await dbManager.writeDb(db);
      return res.status(401).json({ error: "Unauthorized: Session expired" });
    }

    const user = db.users.find(u => u.id === session.userId);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
    if (user.status === "suspended") {
      return res.status(403).json({ error: "This account is suspended. Contact the NEST team for help." });
    }

    // Throttled activity timestamp for the admin dashboard (max one
    // write/hour). Best-effort — a failed bookkeeping write must not lock
    // out a valid session.
    const now = Date.now();
    if (!user.lastActiveAt || now - new Date(user.lastActiveAt).getTime() > 60 * 60 * 1000) {
      user.lastActiveAt = new Date(now).toISOString();
      try {
        await dbManager.writeDb(db);
      } catch (error) {
        console.error("Could not record activity timestamp:", error);
      }
    }

    (req as any).userId = session.userId;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
}

// Optional Admin Middleware
function authenticateAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  authenticate(req, res, async () => {
    try {
      const userId = (req as any).userId;
      const db = await dbManager.readDb();
      const user = db.users.find(u => u.id === userId);
      // Persistent server-side role — never a client-supplied flag
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Forbidden: Administrator access required" });
      }
      next();
    } catch (error) {
      console.error("Authorization error:", error);
      res.status(500).json({ error: "Authorization failed" });
    }
  });
}

// ----------------------------------------------------
// AUTHENTICATION ENDPOINTS
// ----------------------------------------------------

// Sign Up
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, name, age, nationality, university, currentCity, languages, personalityType, friendshipType, bio, photo, tiktok, instagram, otherSocial, interests } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name are required" });
    }

    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    if (!isTestEnv && !signupLimiter.check(clientIp(req))) {
      return res.status(429).json({ error: "Too many sign-up attempts. Please try again later." });
    }

    const db = await dbManager.readDb();
    
    // Check if user already exists
    if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: "Account with this email already exists" });
    }

    const userId = generateId();
    const profileId = generateId();

    const isAdmin = isAdminEmail(email);

    const newUser: User = {
      id: userId,
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      isAdmin: isAdmin,
      role: isAdmin ? "admin" : "member",
      status: "active",
      source: "web",
      isPremium: false,
      createdAt: new Date().toISOString()
    };

    const defaultInterests = {
      activities: [],
      music: [],
      social: [],
      lifestyle: [],
      spendingStyle: "middle range baddie"
    };

    const newProfile: UserProfile = {
      id: profileId,
      userId: userId,
      name: name,
      age: Number(age) || 20,
      nationality: nationality || "",
      university: university || "IE University",
      currentCity: currentCity || "Madrid",
      languages: languages || [],
      personalityType: personalityType || "",
      friendshipType: friendshipType || "",
      bio: bio || "",
      interests: interests || defaultInterests,
      isVerified: false,
      verificationStatus: "unsubmitted",
      avatarSeed: name,
      avatarColor: "#" + Math.floor(Math.random() * 16777215).toString(16),
      photo: photo || "https://images.unsplash.com/photo-1512413919939-b40067ca849d?auto=format&fit=crop&w=600&q=80",
      tiktok: tiktok || undefined,
      instagram: instagram || undefined,
      otherSocial: otherSocial || undefined,
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    db.profiles.push(newProfile);

    // Create session
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    db.sessions.push({
      token,
      userId,
      expiresAt
    });

    await dbManager.writeDb(db);

    res.json({
      token,
      user: {
        id: userId,
        email: newUser.email,
        isAdmin: newUser.isAdmin,
        isPremium: newUser.isPremium
      },
      profile: ownProfileView(newProfile)
    });

  } catch (error: any) {
    console.error("Sign Up Error:", error);
    res.status(500).json({ error: "Error during sign up" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (!isTestEnv && !loginLimiter.check(`${clientIp(req)}:${String(email).toLowerCase()}`)) {
      return res.status(429).json({ error: "Too many login attempts. Please try again in a few minutes." });
    }

    const db = await dbManager.readDb();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Transparent migration: re-hash legacy plain-text records on first
    // successful login so plain text disappears from the database.
    if (!isHashedPassword(user.passwordHash)) {
      user.passwordHash = await hashPassword(password);
    }

    const profile = db.profiles.find(p => p.userId === user.id);

    // Auto-promote configured admin accounts on login
    if (isAdminEmail(user.email) && !user.isAdmin) {
      user.isAdmin = true;
    }

    // Session hygiene: drop expired sessions, then create a fresh one
    const now = Date.now();
    db.sessions = db.sessions.filter(s => new Date(s.expiresAt).getTime() > now);

    const token = generateSessionToken();
    const expiresAt = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    db.sessions.push({
      token,
      userId: user.id,
      expiresAt
    });

    await dbManager.writeDb(db);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
        isPremium: hasActiveSubscription(user)
      },
      profile: profile ? ownProfileView(profile) : profile
    });

  } catch (error: any) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Error during login" });
  }
});

// Get Current User (Me)
app.get("/api/auth/me", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const db = await dbManager.readDb();
    const user = db.users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const profile = db.profiles.find(p => p.userId === userId);

    // Auto-promote configured admin accounts when their token is verified
    if (isAdminEmail(user.email) && !user.isAdmin) {
      user.isAdmin = true;
      await dbManager.writeDb(db);
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
        isPremium: hasActiveSubscription(user)
      },
      profile: profile ? ownProfileView(profile) : profile
    });
  } catch (error) {
    res.status(500).json({ error: "Error retrieving current user" });
  }
});

// Sign out: invalidate the presented session token server-side. Account and
// data are untouched — this is the non-destructive counterpart of account
// deletion.
app.post("/api/auth/logout", authenticate, async (req, res) => {
  try {
    const token = (req.headers.authorization as string).substring(7);
    const db = await dbManager.readDb();
    db.sessions = db.sessions.filter(s => s.token !== token);
    await dbManager.writeDb(db);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error signing out" });
  }
});

// ----------------------------------------------------
// PROFILE ENDPOINTS
// ----------------------------------------------------

// Update Profile
app.post("/api/profiles/update", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const data = req.body;

    const db = await dbManager.readDb();
    const profileIdx = db.profiles.findIndex(p => p.userId === userId);

    if (profileIdx === -1) {
      return res.status(404).json({ error: "Profile not found" });
    }

    db.profiles[profileIdx] = {
      ...db.profiles[profileIdx],
      name: data.name || db.profiles[profileIdx].name,
      age: Number(data.age) || db.profiles[profileIdx].age,
      nationality: data.nationality || db.profiles[profileIdx].nationality,
      university: data.university || db.profiles[profileIdx].university,
      currentCity: data.currentCity || db.profiles[profileIdx].currentCity,
      languages: data.languages || db.profiles[profileIdx].languages,
      personalityType: data.personalityType || db.profiles[profileIdx].personalityType,
      friendshipType: data.friendshipType || db.profiles[profileIdx].friendshipType,
      bio: data.bio || db.profiles[profileIdx].bio,
      photo: data.photo || db.profiles[profileIdx].photo,
      tiktok: data.tiktok || undefined,
      instagram: data.instagram || undefined,
      otherSocial: data.otherSocial || undefined,
      // Interests are user-editable; sanitize to string arrays. Verification
      // fields are intentionally NOT settable through this endpoint.
      interests: sanitizeInterests(data.interests) || db.profiles[profileIdx].interests,
    };

    await dbManager.writeDb(db);
    res.json(ownProfileView(db.profiles[profileIdx]));
  } catch (error) {
    res.status(500).json({ error: "Error updating profile" });
  }
});

// Submit student-verification details for manual admin review. Submitting
// NEVER verifies the account by itself — an administrator approves or
// rejects every request. Email domain is a supporting signal only.
app.post("/api/verification/submit", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { university, universityEmail, note } = req.body;

    if (!university || typeof university !== "string" || !university.trim()) {
      return res.status(400).json({ error: "University name is required" });
    }
    if (
      !universityEmail ||
      typeof universityEmail !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(universityEmail.trim())
    ) {
      return res.status(400).json({ error: "A valid university email address is required" });
    }

    const db = await dbManager.readDb();
    const profile = db.profiles.find(p => p.userId === userId);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    if (profile.verificationStatus === "approved") {
      return res.status(400).json({ error: "Your account is already verified" });
    }
    if (profile.verificationStatus === "pending") {
      return res.status(400).json({ error: "Your verification is already under review" });
    }

    profile.verificationStatus = "pending";
    profile.isVerified = false;
    profile.university = university.trim();
    profile.verification = {
      ...profile.verification,
      university: university.trim(),
      universityEmail: universityEmail.trim().toLowerCase(),
      userNote: typeof note === "string" && note.trim() ? note.trim().slice(0, 500) : undefined,
      submittedAt: new Date().toISOString(),
      reviewedAt: undefined,
      reviewedById: undefined,
      rejectionReason: undefined
    };

    await dbManager.writeDb(db);
    res.json({ success: true, profile: ownProfileView(profile) });
  } catch (error) {
    res.status(500).json({ error: "Error submitting verification" });
  }
});

// Image upload. Intentionally unauthenticated because onboarding uploads the
// profile photo before the account exists; hardened instead with rate
// limiting, an allowlist, a size cap, content sniffing, and server-generated
// filenames. A deferred-upload flow (upload after signup) would allow full
// authentication and is noted in docs/SECURITY.md.
const ALLOWED_IMAGE_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

app.post("/api/upload", async (req, res) => {
  try {
    if (!isTestEnv && !uploadLimiter.check(clientIp(req))) {
      return res.status(429).json({ error: "Too many uploads. Please try again later." });
    }

    const { fileData } = req.body;
    if (!fileData || typeof fileData !== "string") {
      return res.status(400).json({ error: "Missing file data" });
    }

    // Parse base64 data URL
    const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: "Invalid image format" });
    }

    const declaredMime = matches[1].toLowerCase();
    if (!ALLOWED_IMAGE_MIME.has(declaredMime)) {
      return res.status(400).json({ error: "Only JPEG, PNG, and WEBP images are supported" });
    }

    const buffer = Buffer.from(matches[2], "base64");

    // Check size (8MB max)
    if (buffer.length > 8 * 1024 * 1024) {
      return res.status(400).json({ error: "Image size exceeds the 8MB limit" });
    }

    // Trust file content, not the declared MIME type
    const sniffed = sniffImageType(buffer);
    if (!sniffed) {
      return res.status(400).json({ error: "File content is not a valid JPEG, PNG, or WEBP image" });
    }

    // Server-generated random name; Vercel Blob (persistent) when
    // configured, the local uploads directory otherwise.
    const url = await saveImage(buffer, sniffed);

    res.json({ url });
  } catch (error) {
    console.error("Upload handler error:", error);
    res.status(500).json({ error: "Failed to upload image file" });
  }
});

// Get profiles of OTHER real users for swiping.
//
// Visibility rule (product decision, 2026-07-19): every ACTIVE member is
// discoverable, whether or not her student verification has been approved —
// a community this young looks empty otherwise. Verification is still
// meaningful: only approved members carry the "Verified Student" badge, and
// suspended accounts are never shown. Tightening this back to
// approved-only is a one-line change here.
app.get("/api/profiles", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const db = await dbManager.readDb();

    // Check if current user is swiped already
    const swipedUserIds = db.swipes
      .filter(s => s.fromUserId === userId)
      .map(s => s.toUserId);

    const activeUserIds = new Set(db.users.filter(u => u.status === "active").map(u => u.id));
    const discoverableProfiles = db.profiles.filter(p =>
      p.userId !== userId &&
      activeUserIds.has(p.userId) &&
      !swipedUserIds.includes(p.userId)
    );

    res.json(discoverableProfiles.map(publicProfileView));
  } catch (error) {
    res.status(500).json({ error: "Error loading discovery profiles" });
  }
});

// ----------------------------------------------------
// SWIPE & MATCHES ENDPOINTS
// ----------------------------------------------------

app.post("/api/swipe", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { toUserId, action } = req.body; // "like" or "dislike"

    if (!toUserId || !action) {
      return res.status(400).json({ error: "toUserId and action are required" });
    }

    const db = await dbManager.readDb();

    // Matching mirrors discovery visibility: any active member may swipe and
    // be swiped. Suspended accounts stay out on both sides.
    const actorProfile = db.profiles.find(p => p.userId === userId);
    if (!actorProfile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    const targetProfile = db.profiles.find(p => p.userId === toUserId);
    const targetUser = db.users.find(u => u.id === toUserId);
    if (!targetProfile || !targetUser || targetUser.status !== "active") {
      return res.status(403).json({ error: "This member is not available for matching" });
    }

    // Register swipe
    const newSwipe: Swipe = {
      id: generateId(),
      fromUserId: userId,
      toUserId,
      action,
      createdAt: new Date().toISOString()
    };
    db.swipes.push(newSwipe);

    let isMatch = false;
    let matchId = "";

    // If swipe action is "like", check if toUserId also liked userId
    if (action === "like") {
      const mutualLike = db.swipes.find(s => s.fromUserId === toUserId && s.toUserId === userId && s.action === "like");
      
      if (mutualLike) {
        isMatch = true;
        matchId = generateId();

        const newMatch: Match = {
          id: matchId,
          user1Id: userId,
          user2Id: toUserId,
          createdAt: new Date().toISOString()
        };
        db.matches.push(newMatch);

        // Send reciprocal notifications
        const senderProfile = db.profiles.find(p => p.userId === userId);
        const receiverProfile = db.profiles.find(p => p.userId === toUserId);

        db.notifications.push({
          id: generateId(),
          userId: userId,
          text: `Omg girl, you matched with ${receiverProfile?.name || "someone"}! Start chatting 💬`,
          timestamp: new Date().toISOString(),
          read: false,
          createdAt: new Date().toISOString()
        });

        db.notifications.push({
          id: generateId(),
          userId: toUserId,
          text: `Omg girl, you matched with ${senderProfile?.name || "someone"}! Start chatting 💬`,
          timestamp: new Date().toISOString(),
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    }

    await dbManager.writeDb(db);

    res.json({ success: true, isMatch, matchId });
  } catch (error) {
    res.status(500).json({ error: "Error processing swipe" });
  }
});

// Get active matches for current user
app.get("/api/matches", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const db = await dbManager.readDb();

    const myMatches = db.matches.filter(m => m.user1Id === userId || m.user2Id === userId);

    const myProfile = db.profiles.find(p => p.userId === userId);

    const matchesList = myMatches.map(m => {
      const otherUserId = m.user1Id === userId ? m.user2Id : m.user1Id;
      const otherProfile = db.profiles.find(p => p.userId === otherUserId);
      const messages = db.messages.filter(msg => msg.matchId === m.id);

      // Stable, deterministic score using the same logic as the swipe deck
      const report = myProfile && otherProfile
        ? calculateCompatibility(myProfile, otherProfile)
        : {
            score: 75,
            sharedInterests: [] as string[],
            sharedLanguages: [] as string[],
            matchingVibes: [] as string[],
            explanation: "You are both international students in Madrid looking for friendship."
          };

      return {
        id: m.id,
        otherUserId,
        profile: otherProfile ? publicProfileView(otherProfile) : undefined,
        messages: messages.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
        plans: db.plans.filter(p => p.matchId === m.id),
        compatibilityRating: report.score,
        compatibilityReport: {
          sharedInterests: report.sharedInterests,
          sharedLanguages: report.sharedLanguages,
          matchingVibes: report.matchingVibes,
          explanation: report.explanation
        }
      };
    }).filter(m => m.profile !== undefined); // filter out deleted profiles if any

    res.json(matchesList);
  } catch (error) {
    res.status(500).json({ error: "Error loading matches" });
  }
});

// ----------------------------------------------------
// CHATS & MESSAGES ENDPOINTS
// ----------------------------------------------------

// Send message
app.post("/api/chats/:matchId/messages", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { matchId } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Message text is required" });
    }

    const db = await dbManager.readDb();
    const match = db.matches.find(m => m.id === matchId && (m.user1Id === userId || m.user2Id === userId));

    if (!match) {
      return res.status(403).json({ error: "Forbidden: You are not part of this match" });
    }

    const newMessage: Message = {
      id: generateId(),
      matchId,
      senderId: userId,
      text,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    db.messages.push(newMessage);
    await dbManager.writeDb(db);

    res.json(newMessage);
  } catch (error) {
    res.status(500).json({ error: "Error posting message" });
  }
});

// ----------------------------------------------------
// OUTING PLANS (proposals exchanged inside a match)
// ----------------------------------------------------

// Propose an outing. The proposal is persisted AND posted into the chat as a
// message carrying its planId, so the card appears inline in the thread.
app.post("/api/chats/:matchId/plans", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { matchId } = req.params;
    const { activity, title, placeName, placeArea, placeAddress, date, time, note } = req.body;

    const trimmed = (value: unknown, max: number) =>
      typeof value === "string" && value.trim() ? value.trim().slice(0, max) : "";

    const cleanPlace = trimmed(placeName, 120);
    const cleanDate = trimmed(date, 10);
    const cleanTime = trimmed(time, 5);

    if (!cleanPlace) return res.status(400).json({ error: "A place is required" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return res.status(400).json({ error: "A valid date is required" });
    if (!/^\d{2}:\d{2}$/.test(cleanTime)) return res.status(400).json({ error: "A valid time is required" });

    const db = await dbManager.readDb();
    const match = db.matches.find(m => m.id === matchId && (m.user1Id === userId || m.user2Id === userId));
    if (!match) {
      return res.status(403).json({ error: "Forbidden: You are not part of this match" });
    }

    const receiverId = match.user1Id === userId ? match.user2Id : match.user1Id;

    // One open proposal at a time keeps the thread readable and prevents
    // spamming a match with invitations.
    if (db.plans.some(p => p.matchId === matchId && p.status === "pending")) {
      return res.status(400).json({ error: "There is already a pending outing for this chat" });
    }

    const planId = generateId();
    const now = new Date().toISOString();
    const plan = {
      id: planId,
      matchId,
      senderId: userId,
      receiverId,
      activity: trimmed(activity, 20) || "meet",
      title: trimmed(title, 120) || `Meet at ${cleanPlace}`,
      placeName: cleanPlace,
      placeArea: trimmed(placeArea, 60) || undefined,
      placeAddress: trimmed(placeAddress, 160) || undefined,
      date: cleanDate,
      time: cleanTime,
      note: trimmed(note, 300) || undefined,
      status: "pending" as const,
      createdAt: now
    };
    db.plans.push(plan);

    db.messages.push({
      id: generateId(),
      matchId,
      senderId: userId,
      text: plan.title,
      planId,
      timestamp: now,
      createdAt: now
    });

    const senderName = db.profiles.find(p => p.userId === userId)?.name || "A member";
    db.notifications.push({
      id: generateId(),
      userId: receiverId,
      text: `${senderName} suggested an outing: ${plan.title}`,
      timestamp: now,
      read: false,
      createdAt: now
    });

    await dbManager.writeDb(db);
    res.json(plan);
  } catch (error) {
    console.error("Plan creation error:", error);
    res.status(500).json({ error: "Could not send the outing proposal" });
  }
});

// Accept or decline a proposal. Only the member who received it may answer.
app.post("/api/plans/:planId/respond", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { planId } = req.params;
    const { status } = req.body;

    if (status !== "accepted" && status !== "declined") {
      return res.status(400).json({ error: "Status must be accepted or declined" });
    }

    const db = await dbManager.readDb();
    const plan = db.plans.find(p => p.id === planId);
    if (!plan) return res.status(404).json({ error: "Outing not found" });
    if (plan.receiverId !== userId) {
      return res.status(403).json({ error: "Only the member who received this outing can answer it" });
    }
    if (plan.status !== "pending") {
      return res.status(400).json({ error: "This outing has already been answered" });
    }

    const now = new Date().toISOString();
    plan.status = status;
    plan.respondedAt = now;

    const responderName = db.profiles.find(p => p.userId === userId)?.name || "Your match";
    db.notifications.push({
      id: generateId(),
      userId: plan.senderId,
      text: status === "accepted"
        ? `${responderName} accepted: ${plan.title}`
        : `${responderName} can't make it to: ${plan.title}`,
      timestamp: now,
      read: false,
      createdAt: now
    });

    await dbManager.writeDb(db);
    res.json(plan);
  } catch (error) {
    console.error("Plan response error:", error);
    res.status(500).json({ error: "Could not answer the outing proposal" });
  }
});

// ----------------------------------------------------
// CITY GUIDE ENDPOINTS
// ----------------------------------------------------

// Get Recommendations
app.get("/api/recommendations", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const db = await dbManager.readDb();

    // Map recommendation liked status
    const list = db.recommendations.map(rec => ({
      ...rec,
      userLiked: rec.likedBy.includes(userId)
    }));

    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Error loading recommendations" });
  }
});

// Add Recommendation
// "Recommendations should only appear after: a verified user submits one, or NEST officially publishes one. Never preload recommendations."
app.post("/api/recommendations", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { name, category, description, address, userTags, locationCoords, googleMapsUrl, imageUrl } = req.body;

    if (!name || !category || !description || !address) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = await dbManager.readDb();
    const profile = db.profiles.find(p => p.userId === userId);

    if (!profile) {
      return res.status(400).json({ error: "User profile not found" });
    }

    // Only allow verified users or NEST admins to submit recommendations
    const user = db.users.find(u => u.id === userId);
    const isVerified = profile.isVerified || (user && user.isAdmin);
    if (!isVerified) {
      return res.status(403).json({ error: "Only verified student members can submit secret spots! Please verify your student profile first." });
    }

    const newRec: Recommendation = {
      id: generateId(),
      name,
      category,
      description,
      rating: 5,
      userTags: userTags || [],
      address,
      locationCoords: locationCoords || {
        lat: 40.4167 + (Math.random() - 0.5) * 0.02,
        lng: -3.7037 + (Math.random() - 0.5) * 0.02
      },
      googleMapsUrl: googleMapsUrl || "",
      imageUrl: imageUrl || "",
      authorName: user?.isAdmin ? "NEST official board" : profile.name,
      authorAvatarSeed: profile.name,
      authorAvatarColor: profile.avatarColor,
      authorId: userId,
      likes: 0,
      likedBy: [],
      createdAt: new Date().toISOString()
    };

    db.recommendations.push(newRec);
    await dbManager.writeDb(db);

    res.json(newRec);
  } catch (error) {
    res.status(500).json({ error: "Error posting recommendation" });
  }
});

// Like Recommendation
app.post("/api/recommendations/:id/like", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const db = await dbManager.readDb();
    const recIdx = db.recommendations.findIndex(r => r.id === id);

    if (recIdx === -1) {
      return res.status(404).json({ error: "Recommendation not found" });
    }

    const rec = db.recommendations[recIdx];
    const userLikedIndex = rec.likedBy.indexOf(userId);

    if (userLikedIndex > -1) {
      // Unlike
      rec.likedBy.splice(userLikedIndex, 1);
      rec.likes = Math.max(0, rec.likes - 1);
    } else {
      // Like
      rec.likedBy.push(userId);
      rec.likes += 1;
    }

    await dbManager.writeDb(db);
    res.json({ likes: rec.likes, userLiked: ! (userLikedIndex > -1) });
  } catch (error) {
    res.status(500).json({ error: "Error updating like" });
  }
});

// ----------------------------------------------------
// OFFICIAL NEST EVENTS ENDPOINTS
// ----------------------------------------------------

// Get Events. Everyone may browse; RSVPs require an active NEST Premium
// subscription (see shared/subscription.ts for the plan definition).
app.get("/api/events", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const db = await dbManager.readDb();

    const list = db.events.map(evt => {
      const rsvps = db.rsvps.filter(r => r.eventId === evt.id);
      const isRsvped = rsvps.some(r => r.userId === userId);
      return {
        ...evt,
        rsvpsCount: rsvps.length,
        userRsvped: isRsvped
      };
    });

    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Error loading events" });
  }
});

// Add Event (NEST administrators only)
app.post("/api/events", authenticateAdmin, async (req, res) => {
  try {
    const { title, description, date, time, location, category, imageSeed, price, maxParticipants } = req.body;

    if (!title || !description || !date || !time || !location) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = await dbManager.readDb();

    const newEvent: Event = {
      id: generateId(),
      title,
      description,
      date,
      time,
      location,
      category: category || "social",
      imageSeed: imageSeed || "social",
      organizer: "NEST Official Board 🏛️✨",
      price: price || "Free",
      maxParticipants: maxParticipants ? Number(maxParticipants) : undefined,
      createdAt: new Date().toISOString()
    };

    db.events.push(newEvent);
    await dbManager.writeDb(db);

    res.json(newEvent);
  } catch (error) {
    res.status(500).json({ error: "Error creating official event" });
  }
});

// Delete Event (NEST administrators only)
app.delete("/api/events/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await dbManager.readDb();
    
    db.events = db.events.filter(e => e.id !== id);
    db.rsvps = db.rsvps.filter(r => r.eventId !== id);

    await dbManager.writeDb(db);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error deleting event" });
  }
});

// RSVP to Event (requires active Premium subscription)
app.post("/api/events/:id/rsvp", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const db = await dbManager.readDb();
    const user = db.users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // RSVPs require an active NEST Premium membership (server-side entitlement)
    if (!hasActiveSubscription(user)) {
      return res.status(403).json({
        error: "Premium membership required",
        requiresPremium: true,
        message: "An active NEST Premium membership is required to RSVP to official events."
      });
    }

    const event = db.events.find(e => e.id === id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const rsvps = db.rsvps.filter(r => r.eventId === id);
    const existingRsvpIdx = db.rsvps.findIndex(r => r.eventId === id && r.userId === userId);

    if (existingRsvpIdx > -1) {
      // Cancel RSVP
      db.rsvps.splice(existingRsvpIdx, 1);
      await dbManager.writeDb(db);
      return res.json({ success: true, userRsvped: false, rsvpsCount: rsvps.length - 1 });
    } else {
      // Check limits
      if (event.maxParticipants && rsvps.length >= event.maxParticipants) {
        return res.status(400).json({ error: "This outing is completely full! Look for other curated outings." });
      }

      // Add RSVP
      const newRsvp: EventRsvp = {
        id: generateId(),
        eventId: id,
        userId,
        createdAt: new Date().toISOString()
      };
      db.rsvps.push(newRsvp);
      await dbManager.writeDb(db);
      return res.json({ success: true, userRsvped: true, rsvpsCount: rsvps.length + 1 });
    }

  } catch (error) {
    res.status(500).json({ error: "Error processing event RSVP" });
  }
});

// ----------------------------------------------------
// PREMIUM SUBSCRIPTION (Stripe)
// ----------------------------------------------------

// Membership + plan status. Safe to call whether or not Stripe is
// configured; exposes no secrets.
app.get("/api/subscription/status", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const db = await dbManager.readDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      stripeConfigured: isStripeConfigured(),
      premium: hasActiveSubscription(user),
      subscriptionStatus: user.subscriptionStatus || null,
      premiumExpiresAt: user.premiumExpiresAt || null,
      hasStripeCustomer: Boolean(user.stripeCustomerId),
      plan: {
        name: PREMIUM_PLAN.name,
        priceCents: PREMIUM_PLAN.priceCents,
        currency: PREMIUM_PLAN.currency,
        interval: PREMIUM_PLAN.interval,
        label: PREMIUM_PRICE_LABEL
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Error loading subscription status" });
  }
});

// Create a Stripe Checkout session for the monthly subscription. The card
// form is Stripe-hosted — no card data ever touches this server.
app.post("/api/subscription/checkout", authenticate, async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe || !isStripeConfigured()) {
      return res.status(503).json({
        error: "Premium payments are not configured yet",
        stripeConfigured: false
      });
    }

    const userId = (req as any).userId;
    const db = await dbManager.readDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (hasActiveSubscription(user)) {
      return res.status(400).json({ error: "Your Premium membership is already active" });
    }

    // Create or reuse the Stripe customer for this account
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { nestUserId: user.id }
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await dbManager.writeDb(db);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: premiumPriceId()!, quantity: 1 }],
      client_reference_id: user.id,
      metadata: { nestUserId: user.id },
      allow_promotion_codes: true,
      success_url: `${appBaseUrl()}/?checkout=success`,
      cancel_url: `${appBaseUrl()}/?checkout=cancelled`
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    res.status(500).json({ error: "Could not start checkout. Please try again." });
  }
});

// Stripe Customer Portal — manage payment method, invoices, cancellation.
app.post("/api/subscription/portal", authenticate, async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ error: "Premium payments are not configured yet" });
    }

    const userId = (req as any).userId;
    const db = await dbManager.readDb();
    const user = db.users.find(u => u.id === userId);
    if (!user?.stripeCustomerId) {
      return res.status(400).json({ error: "No billing profile found for this account" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: appBaseUrl()
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe portal error:", error);
    res.status(500).json({ error: "Could not open the billing portal. Please try again." });
  }
});

// ----------------------------------------------------
// SOCIAL FEED ENDPOINTS
// ----------------------------------------------------

// Get Feed Posts
app.get("/api/posts", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const db = await dbManager.readDb();

    const list = db.posts.map(post => {
      const liked = post.likedBy.includes(userId);
      return {
        ...post,
        likes: post.likedBy.length,
        userLiked: liked
      };
    });

    // Sort by newest first
    res.json(list.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  } catch (error) {
    res.status(500).json({ error: "Error loading social posts" });
  }
});

// Create Post
app.post("/api/posts", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { text, imageUrl } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Post text is required" });
    }

    const db = await dbManager.readDb();
    const profile = db.profiles.find(p => p.userId === userId);

    if (!profile) {
      return res.status(400).json({ error: "Profile not found" });
    }

    const newPost: Post = {
      id: generateId(),
      authorId: userId,
      authorName: profile.name,
      authorAvatarSeed: profile.name,
      authorAvatarColor: profile.avatarColor,
      authorUni: profile.university,
      text,
      imageUrl: imageUrl || undefined,
      likes: 0,
      likedBy: [],
      createdAt: new Date().toISOString()
    };

    db.posts.push(newPost);
    await dbManager.writeDb(db);

    res.json(newPost);
  } catch (error) {
    res.status(500).json({ error: "Error creating feed post" });
  }
});

// Like Post
app.post("/api/posts/:id/like", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const db = await dbManager.readDb();
    const postIdx = db.posts.findIndex(p => p.id === id);

    if (postIdx === -1) {
      return res.status(404).json({ error: "Post not found" });
    }

    const post = db.posts[postIdx];
    const userLikedIndex = post.likedBy.indexOf(userId);

    if (userLikedIndex > -1) {
      // Unlike
      post.likedBy.splice(userLikedIndex, 1);
    } else {
      // Like
      post.likedBy.push(userId);
    }

    await dbManager.writeDb(db);
    res.json({ success: true, likes: post.likedBy.length, userLiked: !(userLikedIndex > -1) });
  } catch (error) {
    res.status(500).json({ error: "Error liking post" });
  }
});

// ----------------------------------------------------
// NOTIFICATIONS ENDPOINTS
// ----------------------------------------------------

app.get("/api/notifications", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const db = await dbManager.readDb();

    const list = db.notifications.filter(n => n.userId === userId);
    res.json(list.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  } catch (error) {
    res.status(500).json({ error: "Error loading notifications" });
  }
});

app.post("/api/notifications/read", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const db = await dbManager.readDb();

    db.notifications = db.notifications.map(n => {
      if (n.userId === userId) {
        return { ...n, read: true };
      }
      return n;
    });

    await dbManager.writeDb(db);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error clearing notifications" });
  }
});

// ----------------------------------------------------
// USER DELETION HELPER
// ----------------------------------------------------
function deleteUserData(userId: string, db: any) {
  // 1. Delete user record
  db.users = db.users.filter((u: any) => u.id !== userId);

  // 2. Delete profile
  db.profiles = db.profiles.filter((p: any) => p.userId !== userId);

  // 3. Delete active sessions
  db.sessions = db.sessions.filter((s: any) => s.userId !== userId);

  // 4. Delete recommendations created by user
  db.recommendations = db.recommendations.filter((rec: any) => rec.authorId !== userId);

  // 5. Delete posts created by user
  db.posts = db.posts.filter((post: any) => post.authorId !== userId);

  // 6. Delete RSVPs created by user
  db.rsvps = db.rsvps.filter((rsvp: any) => rsvp.userId !== userId);

  // 7. Delete notifications
  db.notifications = db.notifications.filter((n: any) => n.userId !== userId);

  // 8. Delete swipes (both from and to)
  db.swipes = db.swipes.filter((s: any) => s.fromUserId !== userId && s.toUserId !== userId);

  // 9. Delete messages sent by user or received in matches that are deleted
  const matchesToUser = db.matches.filter((m: any) => m.user1Id === userId || m.user2Id === userId);
  const matchIds = matchesToUser.map((m: any) => m.id);

  db.matches = db.matches.filter((m: any) => m.user1Id !== userId && m.user2Id !== userId);
  db.messages = db.messages.filter((msg: any) => msg.senderId !== userId && !matchIds.includes(msg.matchId));

  // 10. Delete outing proposals in those matches (or involving the user)
  db.plans = (db.plans || []).filter(
    (p: any) => p.senderId !== userId && p.receiverId !== userId && !matchIds.includes(p.matchId)
  );
}

// ----------------------------------------------------
// RECOMMENDATIONS EDIT/DELETE ENDPOINTS
// ----------------------------------------------------

// Edit Recommendation
app.put("/api/recommendations/:id", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { name, category, description, address, userTags, locationCoords, googleMapsUrl, imageUrl } = req.body;

    const db = await dbManager.readDb();
    const recIdx = db.recommendations.findIndex(r => r.id === id);

    if (recIdx === -1) {
      return res.status(404).json({ error: "Recommendation not found" });
    }

    const rec = db.recommendations[recIdx];
    const user = db.users.find(u => u.id === userId);

    // Only creator or admin can edit
    if (rec.authorId !== userId && (!user || !user.isAdmin)) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to edit this recommendation" });
    }

    db.recommendations[recIdx] = {
      ...rec,
      name: name || rec.name,
      category: category || rec.category,
      description: description || rec.description,
      address: address || rec.address,
      userTags: userTags || rec.userTags,
      locationCoords: locationCoords || rec.locationCoords,
      googleMapsUrl: googleMapsUrl !== undefined ? googleMapsUrl : rec.googleMapsUrl,
      imageUrl: imageUrl !== undefined ? imageUrl : rec.imageUrl,
    };

    await dbManager.writeDb(db);
    res.json(db.recommendations[recIdx]);
  } catch (error) {
    res.status(500).json({ error: "Error updating recommendation" });
  }
});

// Delete Recommendation
app.delete("/api/recommendations/:id", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const db = await dbManager.readDb();
    const rec = db.recommendations.find(r => r.id === id);

    if (!rec) {
      return res.status(404).json({ error: "Recommendation not found" });
    }

    const user = db.users.find(u => u.id === userId);

    // Only creator or admin can delete
    if (rec.authorId !== userId && (!user || !user.isAdmin)) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to delete this recommendation" });
    }

    // Clean up stored images (best-effort; deleteImage only touches URLs
    // the upload pipeline could have produced)
    await deleteImage(rec.imageUrl);
    if (Array.isArray((rec as any).images)) {
      for (const img of (rec as any).images as string[]) {
        await deleteImage(img);
      }
    }

    db.recommendations = db.recommendations.filter(r => r.id !== id);
    await dbManager.writeDb(db);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error deleting recommendation" });
  }
});

// ----------------------------------------------------
// SOCIAL POSTS EDIT/DELETE ENDPOINTS
// ----------------------------------------------------

// Edit Post
app.put("/api/posts/:id", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { text, imageUrl } = req.body;

    const db = await dbManager.readDb();
    const postIdx = db.posts.findIndex(p => p.id === id);

    if (postIdx === -1) {
      return res.status(404).json({ error: "Post not found" });
    }

    const post = db.posts[postIdx];
    const user = db.users.find(u => u.id === userId);

    // Only creator or admin can edit
    if (post.authorId !== userId && (!user || !user.isAdmin)) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to edit this post" });
    }

    db.posts[postIdx] = {
      ...post,
      text: text || post.text,
      imageUrl: imageUrl !== undefined ? imageUrl : post.imageUrl
    };

    await dbManager.writeDb(db);
    res.json(db.posts[postIdx]);
  } catch (error) {
    res.status(500).json({ error: "Error updating post" });
  }
});

// Delete Post
app.delete("/api/posts/:id", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const db = await dbManager.readDb();
    const post = db.posts.find(p => p.id === id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const user = db.users.find(u => u.id === userId);

    // Only creator or admin can delete
    if (post.authorId !== userId && (!user || !user.isAdmin)) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to delete this post" });
    }

    db.posts = db.posts.filter(p => p.id !== id);
    await dbManager.writeDb(db);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error deleting post" });
  }
});

// ----------------------------------------------------
// USER/ADMIN ACCOUNT MANAGEMENT ENDPOINTS
// ----------------------------------------------------

// User self-deletion
app.delete("/api/users/me", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const db = await dbManager.readDb();

    const user = db.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const photo = db.profiles.find(p => p.userId === userId)?.photo;

    await cancelStripeSubscriptionSafely(user);
    deleteUserData(userId, db);
    await dbManager.writeDb(db);
    await deleteImage(photo);

    res.json({ success: true, message: "Your account and all associated data have been permanently deleted." });
  } catch (error) {
    res.status(500).json({ error: "Error deleting account" });
  }
});

// Admin list all users
app.get("/api/admin/users", authenticateAdmin, async (req, res) => {
  try {
    const db = await dbManager.readDb();
    // Return users merged with their profiles
    const usersWithProfiles = db.users.map(u => {
      const profile = db.profiles.find(p => p.userId === u.id);
      return {
        id: u.id,
        email: u.email,
        isAdmin: u.isAdmin,
        role: u.role,
        status: u.status,
        source: u.source,
        isPremium: u.isPremium,
        premiumExpiresAt: u.premiumExpiresAt,
        lastActiveAt: u.lastActiveAt,
        createdAt: u.createdAt,
        profile: profile ? {
          name: profile.name,
          age: profile.age,
          university: profile.university,
          nationality: profile.nationality,
          currentCity: profile.currentCity,
          languages: profile.languages,
          photo: profile.photo,
          isVerified: profile.isVerified,
          verificationStatus: profile.verificationStatus,
        } : null
      };
    });

    res.json(usersWithProfiles);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving users list" });
  }
});

// Admin delete any user
app.delete("/api/admin/users/:userId", authenticateAdmin, async (req, res) => {
  try {
    const adminId = (req as any).userId;
    const { userId } = req.params;
    const db = await dbManager.readDb();

    const user = db.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role === "admin" || isAdminEmail(user.email)) {
      return res.status(400).json({ error: "Cannot delete an administrator account!" });
    }

    const photo = db.profiles.find(p => p.userId === userId)?.photo;

    await cancelStripeSubscriptionSafely(user);
    deleteUserData(userId, db);
    recordAudit(db, adminId, "user.delete", userId, user.email);
    await dbManager.writeDb(db);
    await deleteImage(photo);

    res.json({ success: true, message: `User account ${user.email} and all associated data have been deleted.` });
  } catch (error) {
    res.status(500).json({ error: "Error deleting user account" });
  }
});

// Admin: suspend / restore an account. Suspended members cannot log in or
// use authenticated APIs and disappear from discovery.
app.post("/api/admin/users/:userId/suspend", authenticateAdmin, async (req, res) => {
  try {
    const adminId = (req as any).userId;
    const { userId } = req.params;
    const db = await dbManager.readDb();
    const user = db.users.find(u => u.id === userId);

    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === "admin") return res.status(400).json({ error: "Cannot suspend an administrator account" });

    user.status = "suspended";
    db.sessions = db.sessions.filter(s => s.userId !== userId);
    recordAudit(db, adminId, "user.suspend", userId);
    await dbManager.writeDb(db);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error suspending account" });
  }
});

app.post("/api/admin/users/:userId/restore", authenticateAdmin, async (req, res) => {
  try {
    const adminId = (req as any).userId;
    const { userId } = req.params;
    const db = await dbManager.readDb();
    const user = db.users.find(u => u.id === userId);

    if (!user) return res.status(404).json({ error: "User not found" });

    user.status = "active";
    recordAudit(db, adminId, "user.restore", userId);
    await dbManager.writeDb(db);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error restoring account" });
  }
});

// ----------------------------------------------------
// ADMIN VERIFICATION REVIEW ENDPOINTS
// ----------------------------------------------------

// List verification requests (defaults to pending, oldest first)
app.get("/api/admin/verifications", authenticateAdmin, async (req, res) => {
  try {
    const statusFilter = (req.query.status as string) || "pending";
    const db = await dbManager.readDb();

    const list = db.profiles
      .filter(p => (statusFilter === "all" ? true : p.verificationStatus === statusFilter))
      .map(p => {
        const user = db.users.find(u => u.id === p.userId);
        return {
          userId: p.userId,
          name: p.name,
          age: p.age,
          photo: p.photo,
          university: p.university,
          nationality: p.nationality,
          email: user?.email,
          accountCreatedAt: user?.createdAt,
          accountStatus: user?.status,
          verificationStatus: p.verificationStatus,
          verification: p.verification || {}
        };
      })
      .sort((a, b) => (a.verification.submittedAt || "").localeCompare(b.verification.submittedAt || ""));

    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Error loading verification requests" });
  }
});

// Approve a member's verification
app.post("/api/admin/verifications/:userId/approve", authenticateAdmin, async (req, res) => {
  try {
    const adminId = (req as any).userId;
    const { userId } = req.params;
    const db = await dbManager.readDb();
    const profile = db.profiles.find(p => p.userId === userId);

    if (!profile) return res.status(404).json({ error: "Profile not found" });
    if (profile.verificationStatus === "approved") {
      return res.status(400).json({ error: "This member is already approved" });
    }

    profile.verificationStatus = "approved";
    profile.isVerified = true;
    profile.verification = {
      ...profile.verification,
      reviewedAt: new Date().toISOString(),
      reviewedById: adminId,
      rejectionReason: undefined,
      adminNote:
        typeof req.body?.adminNote === "string" && req.body.adminNote.trim()
          ? req.body.adminNote.trim().slice(0, 500)
          : profile.verification?.adminNote
    };

    db.notifications.push({
      id: generateId(),
      userId,
      text: "Your student verification has been approved. Welcome to the NEST community!",
      timestamp: new Date().toISOString(),
      read: false,
      createdAt: new Date().toISOString()
    });

    recordAudit(db, adminId, "verification.approve", userId);
    await dbManager.writeDb(db);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error approving verification" });
  }
});

// Reject a member's verification with a member-visible reason
app.post("/api/admin/verifications/:userId/reject", authenticateAdmin, async (req, res) => {
  try {
    const adminId = (req as any).userId;
    const { userId } = req.params;
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

    if (!reason) {
      return res.status(400).json({ error: "A rejection reason is required" });
    }

    const db = await dbManager.readDb();
    const profile = db.profiles.find(p => p.userId === userId);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    profile.verificationStatus = "rejected";
    profile.isVerified = false;
    profile.verification = {
      ...profile.verification,
      reviewedAt: new Date().toISOString(),
      reviewedById: adminId,
      rejectionReason: reason.slice(0, 300),
      adminNote:
        typeof req.body?.adminNote === "string" && req.body.adminNote.trim()
          ? req.body.adminNote.trim().slice(0, 500)
          : profile.verification?.adminNote
    };

    db.notifications.push({
      id: generateId(),
      userId,
      text: `Your verification could not be approved: ${reason.slice(0, 300)} You can update your details and resubmit.`,
      timestamp: new Date().toISOString(),
      read: false,
      createdAt: new Date().toISOString()
    });

    recordAudit(db, adminId, "verification.reject", userId, reason.slice(0, 300));
    await dbManager.writeDb(db);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error rejecting verification" });
  }
});

// ----------------------------------------------------
// SERVER START & STATIC ASSET MIDDLEWARE
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite dev server middleware...");
    // Dynamic import keeps Vite (a dev-only dependency) out of the
    // production and serverless bundles.
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving production static assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NEST server running on http://0.0.0.0:${PORT}`);
  });
}

// On Vercel the app runs as a serverless function (see api/index.ts) and
// static assets are served by the CDN — only self-hosted runs need a
// listener. Tests import the app directly via supertest.
if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
  startServer();
}

export default app;
