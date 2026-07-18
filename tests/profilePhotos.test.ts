import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, signup, auth } from "./helpers";

const update = (token: string, body: Record<string, unknown>) =>
  request(app).post("/api/profiles/update").set(auth(token)).send(body);

describe("profile photos", () => {
  it("accepts photos the app issued", async () => {
    const user = await signup();
    const res = await update(user.token, {
      photos: ["/uploads/1784000000000_abcdef.jpg", "/uploads/1784000000001_ghijkl.jpg"]
    }).expect(200);

    expect(res.body.photos).toHaveLength(2);
    expect(res.body.photo).toBe(res.body.photos[0]);
  });

  it("refuses a photo another member already uses, so nobody can pass as her", async () => {
    const victim = await signup();
    await update(victim.token, { photos: ["/uploads/victim_photo_1.jpg"] }).expect(200);

    const attacker = await signup();
    const res = await update(attacker.token, { photos: ["/uploads/victim_photo_1.jpg"] }).expect(200);

    expect(res.body.photos).not.toContain("/uploads/victim_photo_1.jpg");

    // …and the victim still has hers
    const victimNow = await request(app).get("/api/auth/me").set(auth(victim.token)).expect(200);
    expect(victimNow.body.profile.photos).toContain("/uploads/victim_photo_1.jpg");
  });

  it("refuses Blob URLs from a store that is not ours", async () => {
    // With a store configured, only that host counts as app-issued.
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_ourstore123_secret";
    try {
      const user = await signup();
      const before = await request(app).get("/api/auth/me").set(auth(user.token)).expect(200);

      const res = await update(user.token, {
        photos: ["https://someone-elses-store.public.blob.vercel-storage.com/uploads/stolen.jpg"]
      }).expect(200);

      expect(res.body.photos).toEqual(before.body.profile.photos);

      // our own store is accepted
      const ours = await update(user.token, {
        photos: ["https://ourstore123.public.blob.vercel-storage.com/uploads/mine.jpg"]
      }).expect(200);
      expect(ours.body.photos).toEqual([
        "https://ourstore123.public.blob.vercel-storage.com/uploads/mine.jpg"
      ]);
    } finally {
      delete process.env.BLOB_READ_WRITE_TOKEN;
    }
  });

  it("refuses arbitrary external URLs", async () => {
    const user = await signup();
    const before = await request(app).get("/api/auth/me").set(auth(user.token)).expect(200);

    const res = await update(user.token, {
      photos: ["https://tracker.example.com/pixel.jpg", "javascript:alert(1)"]
    }).expect(200);

    expect(res.body.photos).toEqual(before.body.profile.photos);
  });

  it("honours a member removing every photo instead of silently restoring it", async () => {
    const user = await signup();
    await update(user.token, { photos: ["/uploads/one.jpg"] }).expect(200);

    const res = await update(user.token, { photos: [] }).expect(200);
    expect(res.body.photos).toEqual([]);
  });

  it("caps the gallery at four", async () => {
    const user = await signup();
    const res = await update(user.token, {
      photos: ["/uploads/a.jpg", "/uploads/b.jpg", "/uploads/c.jpg", "/uploads/d.jpg", "/uploads/e.jpg"]
    }).expect(200);

    expect(res.body.photos).toHaveLength(4);
  });

  it("keeps a photo she already had, even if it predates uploads", async () => {
    const user = await signup({ photo: "https://images.example.com/legacy.jpg" });

    // an older external photo stays usable once it is already on her profile
    const res = await update(user.token, {
      photos: ["https://images.example.com/legacy.jpg", "/uploads/new.jpg"]
    }).expect(200);

    expect(res.body.photos).toEqual(["https://images.example.com/legacy.jpg", "/uploads/new.jpg"]);
  });
});
