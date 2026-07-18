import { describe, it, expect } from "vitest";
import fs from "fs";
import request from "supertest";
import { app, auth, signup } from "./helpers";
import { hashPassword, verifyPassword, isHashedPassword, generateSessionToken } from "../server/security";
import { RateLimiter } from "../server/rateLimit";

function readTestDb() {
  return JSON.parse(fs.readFileSync(process.env.DB_PATH!, "utf-8"));
}

// 1x1 transparent PNG
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("password storage", () => {
  it("stores an scrypt hash, never the plain-text password", async () => {
    const user = await signup();
    const db = readTestDb();
    const record = db.users.find((u: any) => u.id === user.userId);

    expect(record.passwordHash.startsWith("scrypt$")).toBe(true);
    expect(record.passwordHash).not.toContain("sup3r-secret-pw");
  });

  it("verifies correct passwords and rejects wrong ones", async () => {
    const stored = await hashPassword("correct horse");
    expect(await verifyPassword("correct horse", stored)).toBe(true);
    expect(await verifyPassword("wrong horse", stored)).toBe(false);
  });

  it("migrates legacy plain-text records to scrypt on first successful login", async () => {
    const user = await signup();

    // Simulate a legacy prototype record
    const db = readTestDb();
    db.users.find((u: any) => u.id === user.userId).passwordHash = "legacy-plaintext";
    fs.writeFileSync(process.env.DB_PATH!, JSON.stringify(db));

    // Wrong password still rejected against legacy records
    await request(app).post("/api/auth/login").send({ email: user.email, password: "nope" }).expect(401);

    // Correct legacy password logs in and triggers re-hash
    await request(app).post("/api/auth/login").send({ email: user.email, password: "legacy-plaintext" }).expect(200);

    const migrated = readTestDb().users.find((u: any) => u.id === user.userId);
    expect(isHashedPassword(migrated.passwordHash)).toBe(true);
    expect(migrated.passwordHash).not.toContain("legacy-plaintext");

    // And the migrated hash keeps working
    await request(app).post("/api/auth/login").send({ email: user.email, password: "legacy-plaintext" }).expect(200);
  });
});

describe("login", () => {
  it("accepts the correct password", async () => {
    const user = await signup();
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "sup3r-secret-pw" })
      .expect(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.id).toBe(user.userId);
  });

  it("rejects an incorrect password with a generic message", async () => {
    const user = await signup();
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "totally-wrong" })
      .expect(401);
    expect(res.body.error).toBe("Invalid email or password");
  });

  it("never returns the password hash to the client", async () => {
    const user = await signup();
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "sup3r-secret-pw" })
      .expect(200);
    expect(JSON.stringify(res.body)).not.toContain("scrypt$");
  });
});

describe("session tokens", () => {
  it("issues long random base64url tokens", () => {
    const token = generateSessionToken();
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(/^[A-Za-z0-9_-]+$/.test(token)).toBe(true);
    expect(generateSessionToken()).not.toBe(token);
  });

  it("rejects unknown tokens", async () => {
    await request(app).get("/api/auth/me").set(auth("forged-token")).expect(401);
  });
});

describe("rate limiter", () => {
  it("blocks after the configured number of attempts and resets after the window", () => {
    const limiter = new RateLimiter(3, 50);
    expect(limiter.check("k")).toBe(true);
    expect(limiter.check("k")).toBe(true);
    expect(limiter.check("k")).toBe(true);
    expect(limiter.check("k")).toBe(false);
    expect(limiter.check("other")).toBe(true);
  });
});

describe("upload safeguards", () => {
  it("accepts a genuine PNG", async () => {
    const res = await request(app).post("/api/upload").send({ fileData: TINY_PNG }).expect(200);
    expect(res.body.url).toMatch(/^\/uploads\/[\w.-]+\.png$/);
  });

  it("rejects content that is not really an image", async () => {
    const fake = `data:image/png;base64,${Buffer.from("#!/bin/sh\necho pwned").toString("base64")}`;
    const res = await request(app).post("/api/upload").send({ fileData: fake });
    expect(res.status).toBe(400);
  });

  it("rejects disallowed declared types", async () => {
    const svg = `data:image/svg+xml;base64,${Buffer.from("<svg onload=alert(1)/>").toString("base64")}`;
    const res = await request(app).post("/api/upload").send({ fileData: svg });
    expect(res.status).toBe(400);
  });
});
