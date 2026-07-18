import { describe, it, expect } from "vitest";
import fs from "fs";
import request from "supertest";
import { hashPassword } from "../server/security";

// DB_SEED hydrates a MISSING database file (the ephemeral-preview bootstrap).
// The app module is imported dynamically after the env is prepared.
describe("DB_SEED bootstrap", () => {
  it("hydrates an empty deployment with the seeded admin, who can log in with her own password", async () => {
    process.env.DB_PATH = process.env.DB_PATH!.replace(/db\.json$/, "seeded-db.json");
    fs.rmSync(process.env.DB_PATH!, { force: true });

    const passwordHash = await hashPassword("seeded-own-password-1");
    const seed = {
      users: [{
        id: "seed-user-1",
        email: "seeded-admin@nest.test",
        passwordHash,
        isAdmin: true,
        role: "admin",
        status: "active",
        source: "admin_created",
        isPremium: false,
        createdAt: new Date().toISOString()
      }],
      profiles: [{
        id: "seed-profile-1",
        userId: "seed-user-1",
        name: "Seeded Admin",
        age: 21,
        nationality: "Spain 🇪🇸",
        university: "Test University",
        currentCity: "Madrid",
        languages: ["English (Native)"],
        personalityType: "",
        friendshipType: "",
        bio: "Seeded",
        interests: { activities: [], music: [], social: [], lifestyle: [], spendingStyle: "middle range baddie" },
        isVerified: true,
        verificationStatus: "approved",
        avatarSeed: "Seeded Admin",
        avatarColor: "#e6067a",
        photo: "/seed/admin-photo.jpg",
        createdAt: new Date().toISOString()
      }],
      // sessions must never be honored from a seed
      sessions: [{ token: "seeded-token-should-be-ignored", userId: "seed-user-1", expiresAt: "2099-01-01T00:00:00.000Z" }]
    };
    process.env.DB_SEED = Buffer.from(JSON.stringify(seed)).toString("base64");

    try {
      const { default: app } = await import("../server");

      const login = await request(app)
        .post("/api/auth/login")
        .send({ email: "seeded-admin@nest.test", password: "seeded-own-password-1" })
        .expect(200);

      expect(login.body.user.isAdmin).toBe(true);
      expect(login.body.profile.verificationStatus).toBe("approved");
      expect(login.body.profile.photo).toBe("/seed/admin-photo.jpg");

      // Admin APIs are usable by the seeded account
      await request(app)
        .get("/api/admin/users")
        .set({ Authorization: `Bearer ${login.body.token}` })
        .expect(200);

      // Seeded session tokens were discarded
      await request(app)
        .get("/api/auth/me")
        .set({ Authorization: "Bearer seeded-token-should-be-ignored" })
        .expect(401);
    } finally {
      delete process.env.DB_SEED;
    }
  });
});
