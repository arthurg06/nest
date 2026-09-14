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

// The subscription model is gone: NEST is free, and NEST Experiences are
// individually priced events. These tests pin the open-access contract that
// replaced the old Premium gating.
describe("experiences are open to every member", () => {
  it("sends every member the full experience — no teaser shape", async () => {
    const admin = await getAdmin();
    await request(app).post("/api/events").set(auth(admin.token)).send(eventBody).expect(200);

    const member = await signup();
    const res = await request(app).get("/api/events").set(auth(member.token)).expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    const full = res.body.find((e: any) => e.title === eventBody.title);
    expect(full).toBeTruthy();
    expect(full.teaser).toBeUndefined();
    expect(full.location).toBe(eventBody.location);
    expect(full.date).toBe(eventBody.date);
    expect(typeof full.rsvpsCount).toBe("number");
  });

  it("lets any member book a spot without any subscription", async () => {
    const admin = await getAdmin();
    const created = await request(app).post("/api/events").set(auth(admin.token)).send(eventBody).expect(200);

    const member = await signup();
    const booked = await request(app).post(`/api/events/${created.body.id}/rsvp`).set(auth(member.token));
    expect(booked.status).toBe(200);
    expect(booked.body.userRsvped).toBe(true);
  });
});

describe("NEST memories", () => {
  it("is open to every member", async () => {
    const member = await signup();
    const res = await request(app).get("/api/memories").set(auth(member.token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.memories)).toBe(true);
  });

  it("computes totals from real attendance records", async () => {
    const admin = await getAdmin();
    const created = await request(app).post("/api/events").set(auth(admin.token)).send(eventBody).expect(200);

    const member = await signup();
    const friend = await signup();

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

// The admin premium endpoint is legacy, dormant infrastructure: nothing in
// the product reads the flag anymore, but the endpoint stays admin-only.
describe("legacy admin premium endpoint (dormant)", () => {
  it("is admin-only", async () => {
    const a = await signup();
    const b = await signup();
    const res = await request(app)
      .post(`/api/admin/users/${b.userId}/premium`)
      .set(auth(a.token))
      .send({ isPremium: true });
    expect(res.status).toBe(403);
  });
});
