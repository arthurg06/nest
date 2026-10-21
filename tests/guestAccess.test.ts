import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, auth, signup, getAdmin } from "./helpers";

const eventBody = {
  title: "Guest Flow Picnic",
  description: "An experience guests may book too.",
  date: "Saturday, Nov 21",
  time: "12:00",
  location: "Retiro Lake Steps",
  category: "social",
  price: "Free"
};

async function createEvent(overrides: Record<string, unknown> = {}) {
  const admin = await getAdmin();
  const res = await request(app).post("/api/events").set(auth(admin.token)).send({ ...eventBody, ...overrides }).expect(200);
  return res.body;
}

const GUEST_ID = "guestbrowser12345678";
const guestBody = { guestId: GUEST_ID, firstName: "Anna", lastName: "Visitor", whatsapp: "+34 655 444 333" };

describe("guest event browsing", () => {
  it("lists events without authentication and without member data", async () => {
    const event = await createEvent({ title: "Public Browse Check" });
    const member = await signup();
    await request(app).post(`/api/events/${event.id}/rsvp`).set(auth(member.token)).send({ whatsapp: "+34611000111" }).expect(200);

    const res = await request(app).get("/api/guest/events").expect(200);
    const found = res.body.find((e: any) => e.id === event.id);
    expect(found.title).toBe("Public Browse Check");
    expect(found.rsvpsCount).toBe(1);
    expect(found.userRsvped).toBe(false);

    // No member identities or numbers leak through the public list.
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain("611000111");
    expect(raw).not.toContain(member.userId);
    expect(raw).not.toContain("@nest.test");
  });

  it("reflects the caller's own registration via her guest id", async () => {
    const event = await createEvent();
    await request(app).post(`/api/guest/events/${event.id}/rsvp`).send(guestBody).expect(200);

    const mine = await request(app).get(`/api/guest/events?guestId=${GUEST_ID}`).expect(200);
    expect(mine.body.find((e: any) => e.id === event.id).userRsvped).toBe(true);

    const other = await request(app).get("/api/guest/events?guestId=someoneelse1234").expect(200);
    expect(other.body.find((e: any) => e.id === event.id).userRsvped).toBe(false);
  });
});

describe("guest RSVP", () => {
  it("requires first name, last name, a valid number, and a sane guest id", async () => {
    const event = await createEvent();
    for (const bad of [
      { ...guestBody, firstName: "" },
      { ...guestBody, lastName: "  " },
      { ...guestBody, whatsapp: "not-a-number" },
      { ...guestBody, guestId: "x" },
      { firstName: "Anna", lastName: "Visitor", whatsapp: "+34655444333" } // no guestId
    ]) {
      const res = await request(app).post(`/api/guest/events/${event.id}/rsvp`).send(bad);
      expect(res.status).toBe(400);
    }
    const events = await request(app).get("/api/guest/events").expect(200);
    expect(events.body.find((e: any) => e.id === event.id).rsvpsCount).toBe(0);
  });

  it("stores the registration and shows it to admins with a Guest label", async () => {
    const event = await createEvent({ title: "Guest Admin Check" });
    await request(app).post(`/api/guest/events/${event.id}/rsvp`).send(guestBody).expect(200);

    const admin = await getAdmin();
    const res = await request(app).get("/api/admin/event-guests").set(auth(admin.token)).expect(200);
    const entry = res.body.events.find((e: any) => e.id === event.id);
    expect(entry.guestCount).toBe(1);
    expect(entry.guests[0]).toMatchObject({
      name: "Anna Visitor",
      whatsapp: "+34655444333",
      isGuest: true,
      userId: null
    });
  });

  it("deduplicates by browser id and by number, never cancelling by surprise", async () => {
    const event = await createEvent();
    await request(app).post(`/api/guest/events/${event.id}/rsvp`).send(guestBody).expect(200);

    const sameBrowser = await request(app).post(`/api/guest/events/${event.id}/rsvp`).send(guestBody).expect(200);
    expect(sameBrowser.body.alreadyRegistered).toBe(true);

    const sameNumber = await request(app)
      .post(`/api/guest/events/${event.id}/rsvp`)
      .send({ ...guestBody, guestId: "differentbrowser1" })
      .expect(200);
    expect(sameNumber.body.alreadyRegistered).toBe(true);

    const events = await request(app).get("/api/guest/events").expect(200);
    expect(events.body.find((e: any) => e.id === event.id).rsvpsCount).toBe(1);
  });

  it("counts guests toward capacity alongside members", async () => {
    const event = await createEvent({ maxParticipants: 2 });
    const member = await signup();
    await request(app).post(`/api/events/${event.id}/rsvp`).set(auth(member.token)).send({ whatsapp: "+34611000222" }).expect(200);
    await request(app).post(`/api/guest/events/${event.id}/rsvp`).send(guestBody).expect(200);

    const full = await request(app)
      .post(`/api/guest/events/${event.id}/rsvp`)
      .send({ guestId: "thirdbrowser9999", firstName: "Late", lastName: "Guest", whatsapp: "+34699888777" });
    expect(full.status).toBe(409);
    expect(full.body.full).toBe(true);

    // The member side sees the same full state.
    const other = await signup();
    const memberFull = await request(app).post(`/api/events/${event.id}/rsvp`).set(auth(other.token)).send({ whatsapp: "+34600111222" });
    expect(memberFull.status).toBe(409);
  });

  it("rejects unknown events and grants no access to member or admin surfaces", async () => {
    await request(app).post("/api/guest/events/not-a-real-event/rsvp").send(guestBody).expect(404);

    // A guest id is not a session: protected endpoints stay protected.
    await request(app).get("/api/matches").expect(401);
    await request(app).get(`/api/admin/event-guests?guestId=${GUEST_ID}`).expect(401);
    await request(app).get("/api/events").expect(401);
  });

  it("leaves member registrations and their account association untouched", async () => {
    const event = await createEvent();
    const member = await signup();
    await request(app).post(`/api/events/${event.id}/rsvp`).set(auth(member.token)).send({ whatsapp: "+34611333444" }).expect(200);
    await request(app).post(`/api/guest/events/${event.id}/rsvp`).send(guestBody).expect(200);

    const admin = await getAdmin();
    const res = await request(app).get("/api/admin/event-guests").set(auth(admin.token)).expect(200);
    const entry = res.body.events.find((e: any) => e.id === event.id);
    expect(entry.guestCount).toBe(2);
    const memberRow = entry.guests.find((g: any) => g.userId === member.userId);
    expect(memberRow.isGuest).toBe(false);
    expect(memberRow.name.length).toBeGreaterThan(0); // from her profile, not re-collected
  });
});
