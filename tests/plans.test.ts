import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, signup, auth, createMatchedPair } from "./helpers";

const validPlan = {
  activity: "coffee",
  title: "Coffee at Federal Café",
  placeName: "Federal Café",
  placeArea: "Malasaña",
  placeAddress: "Plaza de las Comendadoras, 9",
  date: "2026-07-25",
  time: "17:00",
  note: "Does Saturday work?"
};

describe("outing plans", () => {
  it("sends a proposal, posts it into the chat, and notifies the other member", async () => {
    const { a, b, matchId } = await createMatchedPair();

    const created = await request(app)
      .post(`/api/chats/${matchId}/plans`)
      .set(auth(a.token))
      .send(validPlan)
      .expect(200);

    expect(created.body.status).toBe("pending");
    expect(created.body.senderId).toBe(a.userId);
    expect(created.body.receiverId).toBe(b.userId);
    expect(created.body.placeName).toBe("Federal Café");

    // The proposal appears in the thread, linked to the plan
    const matches = await request(app).get("/api/matches").set(auth(b.token)).expect(200);
    const thread = matches.body.find((m: any) => m.id === matchId);
    expect(thread.plans).toHaveLength(1);
    const planMessage = thread.messages.find((m: any) => m.planId === created.body.id);
    expect(planMessage).toBeDefined();
    expect(planMessage.senderId).toBe(a.userId);

    // The receiver is notified
    const notifications = await request(app).get("/api/notifications").set(auth(b.token)).expect(200);
    expect(notifications.body.some((n: any) => n.text.includes("Coffee at Federal Café"))).toBe(true);
  });

  it("rejects proposals from someone outside the match", async () => {
    const { matchId } = await createMatchedPair();
    const stranger = await signup();

    await request(app)
      .post(`/api/chats/${matchId}/plans`)
      .set(auth(stranger.token))
      .send(validPlan)
      .expect(403);
  });

  it("validates place, date, and time", async () => {
    const { a, matchId } = await createMatchedPair();

    await request(app)
      .post(`/api/chats/${matchId}/plans`)
      .set(auth(a.token))
      .send({ ...validPlan, placeName: "  " })
      .expect(400);

    await request(app)
      .post(`/api/chats/${matchId}/plans`)
      .set(auth(a.token))
      .send({ ...validPlan, date: "next friday" })
      .expect(400);

    await request(app)
      .post(`/api/chats/${matchId}/plans`)
      .set(auth(a.token))
      .send({ ...validPlan, time: "5pm" })
      .expect(400);
  });

  it("allows only one pending proposal per chat", async () => {
    const { a, matchId } = await createMatchedPair();

    await request(app).post(`/api/chats/${matchId}/plans`).set(auth(a.token)).send(validPlan).expect(200);
    await request(app).post(`/api/chats/${matchId}/plans`).set(auth(a.token)).send(validPlan).expect(400);
  });

  it("lets the receiver accept, and only her", async () => {
    const { a, b, matchId } = await createMatchedPair();
    const created = await request(app)
      .post(`/api/chats/${matchId}/plans`)
      .set(auth(a.token))
      .send(validPlan)
      .expect(200);

    // the sender cannot answer her own proposal
    await request(app)
      .post(`/api/plans/${created.body.id}/respond`)
      .set(auth(a.token))
      .send({ status: "accepted" })
      .expect(403);

    const answered = await request(app)
      .post(`/api/plans/${created.body.id}/respond`)
      .set(auth(b.token))
      .send({ status: "accepted" })
      .expect(200);
    expect(answered.body.status).toBe("accepted");
    expect(answered.body.respondedAt).toBeTruthy();

    // answering twice is refused
    await request(app)
      .post(`/api/plans/${created.body.id}/respond`)
      .set(auth(b.token))
      .send({ status: "declined" })
      .expect(400);

    // the sender is told
    const notifications = await request(app).get("/api/notifications").set(auth(a.token)).expect(200);
    expect(notifications.body.some((n: any) => n.text.includes("accepted"))).toBe(true);
  });

  it("supports declining, which frees the chat for a new proposal", async () => {
    const { a, b, matchId } = await createMatchedPair();
    const created = await request(app)
      .post(`/api/chats/${matchId}/plans`)
      .set(auth(a.token))
      .send(validPlan)
      .expect(200);

    await request(app)
      .post(`/api/plans/${created.body.id}/respond`)
      .set(auth(b.token))
      .send({ status: "declined" })
      .expect(200);

    await request(app)
      .post(`/api/chats/${matchId}/plans`)
      .set(auth(b.token))
      .send({ ...validPlan, title: "Walk at Retiro", placeName: "Parque del Retiro" })
      .expect(200);
  });

  it("a stale invite nobody answered no longer blocks the chat", async () => {
    const { a, matchId } = await createMatchedPair();

    // an invite for a date that has passed
    const past = await request(app)
      .post(`/api/chats/${matchId}/plans`)
      .set(auth(a.token))
      .send({ ...validPlan, date: "2020-01-05" });
    // the server refuses past dates outright now
    expect(past.status).toBe(400);

    // and a pending invite for today still blocks a second one
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    await request(app).post(`/api/chats/${matchId}/plans`).set(auth(a.token)).send({ ...validPlan, date: iso }).expect(200);
    await request(app).post(`/api/chats/${matchId}/plans`).set(auth(a.token)).send({ ...validPlan, date: iso }).expect(400);
  });

  it("lets the sender withdraw her own invite, and only her", async () => {
    const { a, b, matchId } = await createMatchedPair();
    const created = await request(app)
      .post(`/api/chats/${matchId}/plans`)
      .set(auth(a.token))
      .send(validPlan)
      .expect(200);

    // the receiver cannot "withdraw" — that is the sender's action
    await request(app)
      .post(`/api/plans/${created.body.id}/respond`)
      .set(auth(b.token))
      .send({ status: "cancelled" })
      .expect(403);

    await request(app)
      .post(`/api/plans/${created.body.id}/respond`)
      .set(auth(a.token))
      .send({ status: "cancelled" })
      .expect(200);

    // the chat is free again
    await request(app).post(`/api/chats/${matchId}/plans`).set(auth(a.token)).send(validPlan).expect(200);
  });

  it("refuses statuses outside accepted/declined", async () => {
    const { a, b, matchId } = await createMatchedPair();
    const created = await request(app)
      .post(`/api/chats/${matchId}/plans`)
      .set(auth(a.token))
      .send(validPlan)
      .expect(200);

    await request(app)
      .post(`/api/plans/${created.body.id}/respond`)
      .set(auth(b.token))
      .send({ status: "maybe" })
      .expect(400);
  });
});
