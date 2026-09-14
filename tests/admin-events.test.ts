import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, auth, signup, getAdmin, approveUser } from "./helpers";

const eventBody = {
  title: "Retiro Sunday Picnic",
  description: "Blankets, snacks, and new friends.",
  date: "Sunday, Sep 14",
  time: "12:00",
  location: "Retiro Lake Steps",
  category: "social",
  price: "Free"
};

describe("admin API authorization", () => {
  it("regular users cannot access the admin user list", async () => {
    const user = await signup();
    const res = await request(app).get("/api/admin/users").set(auth(user.token));
    expect(res.status).toBe(403);
  });

  it("admins can access the user list with management fields", async () => {
    const admin = await getAdmin();
    const res = await request(app).get("/api/admin/users").set(auth(admin.token)).expect(200);
    const me = res.body.find((u: any) => u.id === admin.userId);
    expect(me.role).toBe("admin");
    expect(me.status).toBe("active");
    expect(me.source).toBe("web");
  });

  it("unauthenticated requests are rejected", async () => {
    await request(app).get("/api/admin/users").expect(401);
  });
});

describe("event management authorization", () => {
  it("regular users cannot create events", async () => {
    const user = await signup();
    const res = await request(app).post("/api/events").set(auth(user.token)).send(eventBody);
    expect(res.status).toBe(403);
  });

  it("regular users cannot delete events", async () => {
    const admin = await getAdmin();
    const created = await request(app).post("/api/events").set(auth(admin.token)).send(eventBody).expect(200);

    const user = await signup();
    const res = await request(app).delete(`/api/events/${created.body.id}`).set(auth(user.token));
    expect(res.status).toBe(403);

    // cleanup by admin works
    await request(app).delete(`/api/events/${created.body.id}`).set(auth(admin.token)).expect(200);
  });

  it("admins can create and delete events", async () => {
    const admin = await getAdmin();
    const created = await request(app).post("/api/events").set(auth(admin.token)).send(eventBody).expect(200);
    expect(created.body.title).toBe(eventBody.title);
    await request(app).delete(`/api/events/${created.body.id}`).set(auth(admin.token)).expect(200);
  });
});

describe("experience booking (server-side)", () => {
  it("any member can book a spot — no subscription required", async () => {
    const admin = await getAdmin();
    const event = await request(app).post("/api/events").set(auth(admin.token)).send(eventBody).expect(200);

    const user = await signup();
    await approveUser(user.userId);
    const res = await request(app).post(`/api/events/${event.body.id}/rsvp`).set(auth(user.token)).expect(200);
    expect(res.body.userRsvped).toBe(true);

    await request(app).delete(`/api/events/${event.body.id}`).set(auth(admin.token)).expect(200);
  });

  it("capacity is enforced", async () => {
    const admin = await getAdmin();
    const event = await request(app)
      .post("/api/events")
      .set(auth(admin.token))
      .send({ ...eventBody, maxParticipants: 1 })
      .expect(200);

    const first = await signup();
    const second = await signup();

    const ok = await request(app).post(`/api/events/${event.body.id}/rsvp`).set(auth(first.token)).expect(200);
    expect(ok.body.userRsvped).toBe(true);

    const full = await request(app).post(`/api/events/${event.body.id}/rsvp`).set(auth(second.token));
    expect(full.status).toBe(400);

    await request(app).delete(`/api/events/${event.body.id}`).set(auth(admin.token)).expect(200);
  });
});
