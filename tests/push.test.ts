import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, signup, auth, getAdmin } from "./helpers";
import { DEFAULT_NOTIFICATION_PREFS, prefsFor } from "../server/push";

// The test environment deliberately has no VAPID keys: delivery is a no-op
// and the subscribe endpoint says so. What matters here is authorization,
// preference storage, and that nothing leaks between members.

describe("push endpoints", () => {
  it("exposes configuration state publicly (no secrets)", async () => {
    const res = await request(app).get("/api/push/public-key").expect(200);
    expect(res.body.configured).toBe(false);
    expect(res.body.publicKey).toBeNull();
  });

  it("requires auth to subscribe and reports unconfigured push", async () => {
    const anon = await request(app).post("/api/push/subscribe").send({ subscription: {} });
    expect(anon.status).toBe(401);

    const user = await signup();
    const res = await request(app)
      .post("/api/push/subscribe")
      .set(auth(user.token))
      .send({ subscription: { endpoint: "https://push.example.com/x", keys: { p256dh: "a", auth: "b" } } });
    expect(res.status).toBe(503);
  });

  it("requires auth to unsubscribe", async () => {
    const res = await request(app).post("/api/push/unsubscribe").send({ endpoint: "https://push.example.com/x" });
    expect(res.status).toBe(401);
  });
});

describe("notification preferences", () => {
  it("defaults to everything enabled", async () => {
    const user = await signup();
    const res = await request(app).get("/api/notifications/preferences").set(auth(user.token)).expect(200);
    expect(res.body.preferences).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(res.body.hasSubscription).toBe(false);
  });

  it("persists updates and ignores unknown fields", async () => {
    const user = await signup();
    const update = await request(app)
      .post("/api/notifications/preferences")
      .set(auth(user.token))
      .send({ preferences: { likes: false, outingReminders: false, hacker: true } })
      .expect(200);
    expect(update.body.preferences.likes).toBe(false);
    expect(update.body.preferences.outingReminders).toBe(false);
    expect(update.body.preferences.messages).toBe(true);
    expect(update.body.preferences.hacker).toBeUndefined();

    const again = await request(app).get("/api/notifications/preferences").set(auth(user.token)).expect(200);
    expect(again.body.preferences.likes).toBe(false);
  });

  it("prefsFor treats an absent record as all-enabled and merges partials", () => {
    expect(prefsFor({} as any)).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(prefsFor({ notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS, enabled: false } } as any).enabled).toBe(false);
  });
});

describe("reminder runner", () => {
  it("refuses everyone but the cron secret or an admin", async () => {
    const anon = await request(app).post("/api/push/run-reminders");
    expect(anon.status).toBe(403);

    const member = await signup();
    const asMember = await request(app).post("/api/push/run-reminders").set(auth(member.token));
    expect(asMember.status).toBe(403);

    const admin = await getAdmin();
    const asAdmin = await request(app).post("/api/push/run-reminders").set(auth(admin.token));
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body.pushConfigured).toBe(false);
  });
});
