import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, signup, auth, getAdmin } from "./helpers";

const eventBody = {
  title: "Sunset Picnic at Retiro",
  description: "Blankets, snacks and golden hour with the NEST team.",
  date: "Saturday, Sep 12",
  time: "18:00",
  location: "Retiro Lake Steps",
  category: "social",
  price: "Free"
};

const grantPremium = async (userId: string, isPremium: boolean) => {
  const admin = await getAdmin();
  return request(app)
    .post(`/api/admin/users/${userId}/premium`)
    .set(auth(admin.token))
    .send({ isPremium });
};

describe("admin premium grant/revoke", () => {
  it("is admin-only", async () => {
    const a = await signup();
    const b = await signup();
    const res = await request(app)
      .post(`/api/admin/users/${b.userId}/premium`)
      .set(auth(a.token))
      .send({ isPremium: true });
    expect(res.status).toBe(403);
  });

  it("grants and revokes", async () => {
    const member = await signup();
    const granted = await grantPremium(member.userId, true);
    expect(granted.status).toBe(200);
    expect(granted.body.isPremium).toBe(true);

    const me = await request(app).get("/api/auth/me").set(auth(member.token)).expect(200);
    expect(me.body.user.isPremium).toBe(true);

    const revoked = await grantPremium(member.userId, false);
    expect(revoked.body.isPremium).toBe(false);
  });
});

describe("premium-only outings", () => {
  it("sends non-premium members only a teaser — no date, time, location, description or attendance", async () => {
    const admin = await getAdmin();
    await request(app).post("/api/events").set(auth(admin.token)).send(eventBody).expect(200);

    const member = await signup();
    const res = await request(app).get("/api/events").set(auth(member.token)).expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const evt of res.body) {
      expect(evt.teaser).toBe(true);
      expect(evt.category).toBeTruthy();
      expect(evt.title).toBeUndefined();
      expect(evt.description).toBeUndefined();
      expect(evt.date).toBeUndefined();
      expect(evt.time).toBeUndefined();
      expect(evt.location).toBeUndefined();
      expect(evt.rsvpsCount).toBeUndefined();
      expect(evt.userRsvped).toBeUndefined();
    }
  });

  it("sends premium members the full outing", async () => {
    const admin = await getAdmin();
    await request(app).post("/api/events").set(auth(admin.token)).send(eventBody).expect(200);

    const member = await signup();
    await grantPremium(member.userId, true);

    const res = await request(app).get("/api/events").set(auth(member.token)).expect(200);
    const full = res.body.find((e: any) => e.title === eventBody.title);
    expect(full).toBeTruthy();
    expect(full.teaser).toBeUndefined();
    expect(full.location).toBe(eventBody.location);
    expect(typeof full.rsvpsCount).toBe("number");
  });

  it("keeps RSVPs premium-gated server-side", async () => {
    const admin = await getAdmin();
    const created = await request(app).post("/api/events").set(auth(admin.token)).send(eventBody).expect(200);

    const member = await signup();
    const denied = await request(app).post(`/api/events/${created.body.id}/rsvp`).set(auth(member.token));
    expect(denied.status).toBe(403);
    expect(denied.body.requiresPremium).toBe(true);

    await grantPremium(member.userId, true);
    const allowed = await request(app).post(`/api/events/${created.body.id}/rsvp`).set(auth(member.token));
    expect(allowed.status).toBe(200);
  });
});

describe("NEST memories", () => {
  it("is premium-gated", async () => {
    const member = await signup();
    const res = await request(app).get("/api/memories").set(auth(member.token));
    expect(res.status).toBe(403);
    expect(res.body.requiresPremium).toBe(true);
  });

  it("computes totals from real attendance records", async () => {
    const admin = await getAdmin();
    const created = await request(app).post("/api/events").set(auth(admin.token)).send(eventBody).expect(200);

    const member = await signup();
    const friend = await signup();
    await grantPremium(member.userId, true);
    await grantPremium(friend.userId, true);

    // Empty before attending anything.
    const before = await request(app).get("/api/memories").set(auth(member.token)).expect(200);
    expect(before.body.memories.filter((m: any) => m.eventId === created.body.id)).toHaveLength(0);

    await request(app).post(`/api/events/${created.body.id}/rsvp`).set(auth(member.token)).expect(200);
    await request(app).post(`/api/events/${created.body.id}/rsvp`).set(auth(friend.token)).expect(200);

    const after = await request(app).get("/api/memories").set(auth(member.token)).expect(200);
    const memory = after.body.memories.find((m: any) => m.eventId === created.body.id);
    expect(memory).toBeTruthy();
    expect(memory.attendeeCount).toBe(2);
    expect(memory.photoCount).toBe(0); // no album photos exist — never invented
    expect(after.body.totals.attendees).toBeGreaterThanOrEqual(1);
  });
});
