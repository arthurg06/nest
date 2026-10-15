import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, auth, signup, getAdmin } from "./helpers";

const eventBody = {
  title: "Pilates & Brunch",
  description: "Pilates, brunch, and meeting new girls.",
  date: "Saturday, Nov 14",
  time: "11:00",
  location: "Chamberí Studio",
  category: "wellness",
  price: "€38"
};

async function createEvent(overrides: Record<string, unknown> = {}) {
  const admin = await getAdmin();
  const res = await request(app)
    .post("/api/events")
    .set(auth(admin.token))
    .send({ ...eventBody, ...overrides })
    .expect(200);
  return res.body;
}

describe("experience RSVP with WhatsApp confirmation", () => {
  it("requires a valid WhatsApp number to register", async () => {
    const event = await createEvent();
    const user = await signup();

    // No number at all → the registration is refused (a bare POST is the
    // explicit-cancel shape, which needs an existing registration).
    const bare = await request(app).post(`/api/events/${event.id}/rsvp`).set(auth(user.token)).send({});
    expect(bare.status).toBe(400);

    for (const invalid of ["", "   ", "not-a-number", "12345", "+12 345 678 901 234 567 890", "+34 6a2 345 678"]) {
      const res = await request(app)
        .post(`/api/events/${event.id}/rsvp`)
        .set(auth(user.token))
        .send({ whatsapp: invalid });
      expect(res.status).toBe(400);
    }

    // Nothing was recorded by the failed attempts.
    const events = await request(app).get("/api/events").set(auth(user.token)).expect(200);
    expect(events.body.find((e: any) => e.id === event.id).rsvpsCount).toBe(0);
  });

  it("accepts international formats and stores the normalized number", async () => {
    const event = await createEvent();
    const user = await signup();

    await request(app)
      .post(`/api/events/${event.id}/rsvp`)
      .set(auth(user.token))
      .send({ whatsapp: "+44 (7700) 900-123" })
      .expect(200);

    const admin = await getAdmin();
    const guests = await request(app).get("/api/admin/event-guests").set(auth(admin.token)).expect(200);
    const entry = guests.body.events.find((e: any) => e.id === event.id);
    expect(entry.guests).toHaveLength(1);
    expect(entry.guests[0].whatsapp).toBe("+447700900123");
    expect(typeof entry.guests[0].rsvpAt).toBe("string");
  });

  it("reports existing status on a duplicate registration instead of duplicating or cancelling", async () => {
    const event = await createEvent();
    const user = await signup();

    await request(app).post(`/api/events/${event.id}/rsvp`).set(auth(user.token)).send({ whatsapp: "+34611222333" }).expect(200);

    const again = await request(app)
      .post(`/api/events/${event.id}/rsvp`)
      .set(auth(user.token))
      .send({ whatsapp: "+34611222333" })
      .expect(200);
    expect(again.body.alreadyRegistered).toBe(true);
    expect(again.body.userRsvped).toBe(true);
    expect(again.body.rsvpsCount).toBe(1); // never counts twice toward capacity

    // The explicit cancel is a bare POST.
    const cancel = await request(app).post(`/api/events/${event.id}/rsvp`).set(auth(user.token)).send({}).expect(200);
    expect(cancel.body.userRsvped).toBe(false);
  });

  it("answers full with the dedicated flag once capacity is reached", async () => {
    const event = await createEvent({ maxParticipants: 1 });
    const first = await signup();
    const second = await signup();

    await request(app).post(`/api/events/${event.id}/rsvp`).set(auth(first.token)).send({ whatsapp: "+34611222333" }).expect(200);

    const full = await request(app)
      .post(`/api/events/${event.id}/rsvp`)
      .set(auth(second.token))
      .send({ whatsapp: "+34698765432" });
    expect(full.status).toBe(409);
    expect(full.body.full).toBe(true);
  });

  it("never exposes WhatsApp numbers outside the admin endpoint", async () => {
    const event = await createEvent();
    const user = await signup();
    await request(app).post(`/api/events/${event.id}/rsvp`).set(auth(user.token)).send({ whatsapp: "+34611222333" }).expect(200);

    const other = await signup();
    const events = await request(app).get("/api/events").set(auth(other.token)).expect(200);
    expect(JSON.stringify(events.body)).not.toContain("611222333");

    const poll = await request(app).get("/api/poll").set(auth(other.token)).expect(200);
    expect(JSON.stringify(poll.body)).not.toContain("611222333");

    const mine = await request(app).get("/api/my-events").set(auth(user.token)).expect(200);
    expect(JSON.stringify(mine.body)).not.toContain("611222333");
  });
});

describe("admin event guests", () => {
  it("is admin-only, server-enforced", async () => {
    const user = await signup();
    await request(app).get("/api/admin/event-guests").set(auth(user.token)).expect(403);
    await request(app).get("/api/admin/event-guests").expect(401);
  });

  it("lists guests per event with name, number, counts, and capacity", async () => {
    const event = await createEvent({ title: "Guest List Check", maxParticipants: 12 });
    const a = await signup();
    const b = await signup();
    await request(app).post(`/api/events/${event.id}/rsvp`).set(auth(a.token)).send({ whatsapp: "+34611111111" }).expect(200);
    await request(app).post(`/api/events/${event.id}/rsvp`).set(auth(b.token)).send({ whatsapp: "+34622222222" }).expect(200);

    const admin = await getAdmin();
    const res = await request(app).get("/api/admin/event-guests").set(auth(admin.token)).expect(200);
    const entry = res.body.events.find((e: any) => e.id === event.id);
    expect(entry.guestCount).toBe(2);
    expect(entry.maxParticipants).toBe(12);
    expect(entry.guests.map((g: any) => g.whatsapp).sort()).toEqual(["+34611111111", "+34622222222"]);
    for (const guest of entry.guests) {
      expect(typeof guest.name).toBe("string");
      expect(guest.name.length).toBeGreaterThan(0);
    }

    // A cancelled registration leaves the list.
    await request(app).post(`/api/events/${event.id}/rsvp`).set(auth(b.token)).send({}).expect(200);
    const after = await request(app).get("/api/admin/event-guests").set(auth(admin.token)).expect(200);
    expect(after.body.events.find((e: any) => e.id === event.id).guestCount).toBe(1);
  });
});
