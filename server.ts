import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { User, UserProfile, Swipe, Match, Message, Recommendation, Event, EventRsvp, Post, Notification, Session } from "./server/db.js";

// Note: we can import from "./server/db.ts" but since esbuild bundles it, we can write import with relative path
// and typescript handles resolution. In Node, with esbuild bundle, we should import './server/db' without extension or let esbuild resolve it.
import * as dbManager from "./server/db";
import { calculateCompatibility } from "./shared/compatibility";
import { hashPassword, verifyPassword, isHashedPassword, generateSessionToken, generateSecureId, sniffImageType } from "./server/security";
import { RateLimiter } from "./server/rateLimit";

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

// Vercel's deployment filesystem is read-only; /tmp is the only writable
// location there (ephemeral — files reset between cold starts).
const UPLOAD_DIR =
  process.env.UPLOAD_DIR ||
  (process.env.VERCEL ? "/tmp/uploads" : path.join(process.cwd(), "uploads"));

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

// Authentication Middleware
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }
  const token = authHeader.substring(7);
  const db = dbManager.readDb();
  const session = db.sessions.find(s => s.token === token);
  
  if (!session) {
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }

  if (new Date(session.expiresAt) < new Date()) {
    // Clear expired session
    db.sessions = db.sessions.filter(s => s.token !== token);
    dbManager.writeDb(db);
    return res.status(401).json({ error: "Unauthorized: Session expired" });
  }

  (req as any).userId = session.userId;
  next();
}

// Optional Admin Middleware
function authenticateAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  authenticate(req, res, () => {
    const userId = (req as any).userId;
    const db = dbManager.readDb();
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "Forbidden: Administrator access required" });
    }
    next();
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

    const db = dbManager.readDb();
    
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

    dbManager.writeDb(db);

    res.json({
      token,
      user: {
        id: userId,
        email: newUser.email,
        isAdmin: newUser.isAdmin,
        isPremium: newUser.isPremium
      },
      profile: newProfile
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

    const db = dbManager.readDb();
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

    dbManager.writeDb(db);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
        isPremium: user.isPremium
      },
      profile
    });

  } catch (error: any) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Error during login" });
  }
});

// Get Current User (Me)
app.get("/api/auth/me", authenticate, (req, res) => {
  try {
    const userId = (req as any).userId;
    const db = dbManager.readDb();
    const user = db.users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const profile = db.profiles.find(p => p.userId === userId);

    // Auto-promote configured admin accounts when their token is verified
    if (isAdminEmail(user.email) && !user.isAdmin) {
      user.isAdmin = true;
      dbManager.writeDb(db);
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
        isPremium: user.isPremium
      },
      profile
    });
  } catch (error) {
    res.status(500).json({ error: "Error retrieving current user" });
  }
});

// Sign out: invalidate the presented session token server-side. Account and
// data are untouched — this is the non-destructive counterpart of account
// deletion.
app.post("/api/auth/logout", authenticate, (req, res) => {
  try {
    const token = (req.headers.authorization as string).substring(7);
    const db = dbManager.readDb();
    db.sessions = db.sessions.filter(s => s.token !== token);
    dbManager.writeDb(db);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error signing out" });
  }
});

// ----------------------------------------------------
// PROFILE ENDPOINTS
// ----------------------------------------------------

// Update Profile
app.post("/api/profiles/update", authenticate, (req, res) => {
  try {
    const userId = (req as any).userId;
    const data = req.body;

    const db = dbManager.readDb();
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
    };

    dbManager.writeDb(db);
    res.json(db.profiles[profileIdx]);
  } catch (error) {
    res.status(500).json({ error: "Error updating profile" });
  }
});

// Verify Profile (e.g., student verification)
app.post("/api/profiles/verify", authenticate, (req, res) => {
  try {
    const userId = (req as any).userId;
    const db = dbManager.readDb();
    const profileIdx = db.profiles.findIndex(p => p.userId === userId);

    if (profileIdx === -1) {
      return res.status(404).json({ error: "Profile not found" });
    }

    db.profiles[profileIdx].isVerified = true;
    dbManager.writeDb(db);

    res.json({ success: true, profile: db.profiles[profileIdx] });
  } catch (error) {
    res.status(500).json({ error: "Error verifying profile" });
  }
});

// Image upload. Intentionally unauthenticated because onboarding uploads the
// profile photo before the account exists; hardened instead with rate
// limiting, an allowlist, a size cap, content sniffing, and server-generated
// filenames. A deferred-upload flow (upload after signup) would allow full
// authentication and is noted in docs/SECURITY.md.
const ALLOWED_IMAGE_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

app.post("/api/upload", (req, res) => {
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

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    // Server-generated random filename (no client input in the path)
    const finalFileName = `${Date.now()}_${generateSecureId()}.${sniffed}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, finalFileName), buffer);

    res.json({ url: `/uploads/${finalFileName}` });
  } catch (error) {
    console.error("Upload handler error:", error);
    res.status(500).json({ error: "Failed to upload image file" });
  }
});

// Get profiles of OTHER real users for swiping
// Constraint: "Users must verify their account before it becomes visible to others."
app.get("/api/profiles", authenticate, (req, res) => {
  try {
    const userId = (req as any).userId;
    const db = dbManager.readDb();

    // Check if current user is swiped already
    const swipedUserIds = db.swipes
      .filter(s => s.fromUserId === userId)
      .map(s => s.toUserId);

    // Filter profiles:
    // 1. Belongs to other users
    // 2. Is verified
    // 3. Not swiped yet
    const discoverableProfiles = db.profiles.filter(p => 
      p.userId !== userId && 
      p.isVerified && 
      !swipedUserIds.includes(p.userId)
    );

    res.json(discoverableProfiles);
  } catch (error) {
    res.status(500).json({ error: "Error loading discovery profiles" });
  }
});

// ----------------------------------------------------
// SWIPE & MATCHES ENDPOINTS
// ----------------------------------------------------

app.post("/api/swipe", authenticate, (req, res) => {
  try {
    const userId = (req as any).userId;
    const { toUserId, action } = req.body; // "like" or "dislike"

    if (!toUserId || !action) {
      return res.status(400).json({ error: "toUserId and action are required" });
    }

    const db = dbManager.readDb();

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

    dbManager.writeDb(db);

    res.json({ success: true, isMatch, matchId });
  } catch (error) {
    res.status(500).json({ error: "Error processing swipe" });
  }
});

// Get active matches for current user
app.get("/api/matches", authenticate, (req, res) => {
  try {
    const userId = (req as any).userId;
    const db = dbManager.readDb();

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
        profile: otherProfile,
        messages: messages.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
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
app.post("/api/chats/:matchId/messages", authenticate, (req, res) => {
  try {
    const userId = (req as any).userId;
    const { matchId } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Message text is required" });
    }

    const db = dbManager.readDb();
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
    dbManager.writeDb(db);

    res.json(newMessage);
  } catch (error) {
    res.status(500).json({ error: "Error posting message" });
  }
});

// ----------------------------------------------------
// CITY GUIDE ENDPOINTS
// ----------------------------------------------------

// Get Recommendations
app.get("/api/recommendations", authenticate, (req, res) => {
  try {
    const userId = (req as any).userId;
    const db = dbManager.readDb();

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
app.post("/api/recommendations", authenticate, (req, res) => {
  try {
    const userId = (req as any).userId;
    const { name, category, description, address, userTags, locationCoords, googleMapsUrl, imageUrl } = req.body;

    if (!name || !category || !description || !address) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = dbManager.readDb();
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
    dbManager.writeDb(db);

    res.json(newRec);
  } catch (error) {
    res.status(500).json({ error: "Error posting recommendation" });
  }
});

// Like Recommendation
app.post("/api/recommendations/:id/like", authenticate, (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const db = dbManager.readDb();
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

    dbManager.writeDb(db);
    res.json({ likes: rec.likes, userLiked: ! (userLikedIndex > -1) });
  } catch (error) {
    res.status(500).json({ error: "Error updating like" });
  }
});

// ----------------------------------------------------
// OFFICIAL NEST EVENTS ENDPOINTS
// ----------------------------------------------------

// Get Events
// "If there are no published events, show an empty state explaining that no events are currently available.
// Users may browse events for free.
// Users cannot RSVP or join any event unless they have an active NEST Premium subscription (€10/month)."
app.get("/api/events", authenticate, (req, res) => {
  try {
    const userId = (req as any).userId;
    const db = dbManager.readDb();

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
app.post("/api/events", authenticateAdmin, (req, res) => {
  try {
    const { title, description, date, time, location, category, imageSeed, price, maxParticipants } = req.body;

    if (!title || !description || !date || !time || !location) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = dbManager.readDb();

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
    dbManager.writeDb(db);

    res.json(newEvent);
  } catch (error) {
    res.status(500).json({ error: "Error creating official event" });
  }
});

// Delete Event (NEST administrators only)
app.delete("/api/events/:id", authenticateAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const db = dbManager.readDb();
    
    db.events = db.events.filter(e => e.id !== id);
    db.rsvps = db.rsvps.filter(r => r.eventId !== id);

    dbManager.writeDb(db);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error deleting event" });
  }
});

// RSVP to Event (requires active Premium subscription)
app.post("/api/events/:id/rsvp", authenticate, (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const db = dbManager.readDb();
    const user = db.users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // RSVPs require an active NEST Premium membership (server-side entitlement)
    if (!user.isPremium) {
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
      dbManager.writeDb(db);
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
      dbManager.writeDb(db);
      return res.json({ success: true, userRsvped: true, rsvpsCount: rsvps.length + 1 });
    }

  } catch (error) {
    res.status(500).json({ error: "Error processing event RSVP" });
  }
});

// ----------------------------------------------------
// SOCIAL FEED ENDPOINTS
// ----------------------------------------------------

// Get Feed Posts
app.get("/api/posts", authenticate, (req, res) => {
  try {
    const userId = (req as any).userId;
    const db = dbManager.readDb();

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
app.post("/api/posts", authenticate, (req, res) => {
  try {
    const userId = (req as any).userId;
    const { text, imageUrl } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Post text is required" });
    }

    const db = dbManager.readDb();
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
    dbManager.writeDb(db);

    res.json(newPost);
  } catch (error) {
    res.status(500).json({ error: "Error creating feed post" });
  }
});

// Like Post
app.post("/api/posts/:id/like", authenticate, (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const db = dbManager.readDb();
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

    dbManager.writeDb(db);
    res.json({ success: true, likes: post.likedBy.length, userLiked: !(userLikedIndex > -1) });
  } catch (error) {
    res.status(500).json({ error: "Error liking post" });
  }
});

// ----------------------------------------------------
// NOTIFICATIONS ENDPOINTS
// ----------------------------------------------------

app.get("/api/notifications", authenticate, (req, res) => {
  try {
    const userId = (req as any).userId;
    const db = dbManager.readDb();

    const list = db.notifications.filter(n => n.userId === userId);
    res.json(list.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  } catch (error) {
    res.status(500).json({ error: "Error loading notifications" });
  }
});

app.post("/api/notifications/read", authenticate, (req, res) => {
  try {
    const userId = (req as any).userId;
    const db = dbManager.readDb();

    db.notifications = db.notifications.map(n => {
      if (n.userId === userId) {
        return { ...n, read: true };
      }
      return n;
    });

    dbManager.writeDb(db);
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
}

// ----------------------------------------------------
// RECOMMENDATIONS EDIT/DELETE ENDPOINTS
// ----------------------------------------------------

// Edit Recommendation
app.put("/api/recommendations/:id", authenticate, (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { name, category, description, address, userTags, locationCoords, googleMapsUrl, imageUrl } = req.body;

    const db = dbManager.readDb();
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

    dbManager.writeDb(db);
    res.json(db.recommendations[recIdx]);
  } catch (error) {
    res.status(500).json({ error: "Error updating recommendation" });
  }
});

// Delete Recommendation
app.delete("/api/recommendations/:id", authenticate, (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const db = dbManager.readDb();
    const rec = db.recommendations.find(r => r.id === id);

    if (!rec) {
      return res.status(404).json({ error: "Recommendation not found" });
    }

    const user = db.users.find(u => u.id === userId);

    // Only creator or admin can delete
    if (rec.authorId !== userId && (!user || !user.isAdmin)) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to delete this recommendation" });
    }

    // Safely delete associated image from local disk if it's stored in uploads
    const deleteImageFile = (imgUrl: string) => {
      if (imgUrl && imgUrl.startsWith("/uploads/")) {
        const fileName = path.basename(imgUrl);
        const filePath = path.join(UPLOAD_DIR, fileName);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.error("Error deleting local image file:", err);
          }
        }
      }
    };

    if (rec.imageUrl) {
      deleteImageFile(rec.imageUrl);
    }
    if ((rec as any).images && Array.isArray((rec as any).images)) {
      ((rec as any).images).forEach((img: string) => {
        deleteImageFile(img);
      });
    }

    db.recommendations = db.recommendations.filter(r => r.id !== id);
    dbManager.writeDb(db);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error deleting recommendation" });
  }
});

// ----------------------------------------------------
// SOCIAL POSTS EDIT/DELETE ENDPOINTS
// ----------------------------------------------------

// Edit Post
app.put("/api/posts/:id", authenticate, (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { text, imageUrl } = req.body;

    const db = dbManager.readDb();
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

    dbManager.writeDb(db);
    res.json(db.posts[postIdx]);
  } catch (error) {
    res.status(500).json({ error: "Error updating post" });
  }
});

// Delete Post
app.delete("/api/posts/:id", authenticate, (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const db = dbManager.readDb();
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
    dbManager.writeDb(db);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error deleting post" });
  }
});

// ----------------------------------------------------
// USER/ADMIN ACCOUNT MANAGEMENT ENDPOINTS
// ----------------------------------------------------

// User self-deletion
app.delete("/api/users/me", authenticate, (req, res) => {
  try {
    const userId = (req as any).userId;
    const db = dbManager.readDb();

    const user = db.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    deleteUserData(userId, db);
    dbManager.writeDb(db);

    res.json({ success: true, message: "Your account and all associated data have been permanently deleted." });
  } catch (error) {
    res.status(500).json({ error: "Error deleting account" });
  }
});

// Admin list all users
app.get("/api/admin/users", authenticateAdmin, (req, res) => {
  try {
    const db = dbManager.readDb();
    // Return users merged with their profiles
    const usersWithProfiles = db.users.map(u => {
      const profile = db.profiles.find(p => p.userId === u.id);
      return {
        id: u.id,
        email: u.email,
        isAdmin: u.isAdmin,
        isPremium: u.isPremium,
        createdAt: u.createdAt,
        profile: profile ? {
          name: profile.name,
          age: profile.age,
          university: profile.university,
          nationality: profile.nationality,
          currentCity: profile.currentCity,
          languages: profile.languages,
          photo: profile.photo,
        } : null
      };
    });

    res.json(usersWithProfiles);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving users list" });
  }
});

// Admin delete any user
app.delete("/api/admin/users/:userId", authenticateAdmin, (req, res) => {
  try {
    const { userId } = req.params;
    const db = dbManager.readDb();

    const user = db.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (isAdminEmail(user.email)) {
      return res.status(400).json({ error: "Cannot delete an administrator account!" });
    }

    deleteUserData(userId, db);
    dbManager.writeDb(db);

    res.json({ success: true, message: `User account ${user.email} and all associated data have been deleted.` });
  } catch (error) {
    res.status(500).json({ error: "Error deleting user account" });
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
