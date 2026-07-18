import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, auth, createMatchedPair } from "./helpers";
import { isOwnMessage } from "../src/lib/chat";

describe("message ownership helper", () => {
  it("marks the authenticated user's own messages", () => {
    expect(isOwnMessage("user-1", "user-1")).toBe(true);
  });

  it("marks the other participant's messages as not own", () => {
    expect(isOwnMessage("user-2", "user-1")).toBe(false);
  });

  it("never claims ownership when the current user is unknown", () => {
    expect(isOwnMessage("user-1", "")).toBe(false);
    expect(isOwnMessage("", "")).toBe(false);
  });
});

describe("messaging", () => {
  it("stores exactly one message per send — no auto-reply is generated", async () => {
    const { a, matchId } = await createMatchedPair();

    await request(app)
      .post(`/api/chats/${matchId}/messages`)
      .set(auth(a.token))
      .send({ text: "Hola! Coffee this week?" })
      .expect(200);

    const matches = await request(app).get("/api/matches").set(auth(a.token)).expect(200);
    const match = matches.body.find((m: any) => m.id === matchId);
    expect(match.messages).toHaveLength(1);
    expect(match.messages[0].text).toBe("Hola! Coffee this week?");
  });

  it("attributes messages to their real senders in both directions", async () => {
    const { a, b, matchId } = await createMatchedPair();

    await request(app).post(`/api/chats/${matchId}/messages`).set(auth(a.token)).send({ text: "from A" }).expect(200);
    await request(app).post(`/api/chats/${matchId}/messages`).set(auth(b.token)).send({ text: "from B" }).expect(200);

    for (const viewer of [a, b]) {
      const res = await request(app).get("/api/matches").set(auth(viewer.token)).expect(200);
      const match = res.body.find((m: any) => m.id === matchId);
      expect(match.messages).toHaveLength(2);

      const [first, second] = match.messages;
      expect(first.senderId).toBe(a.userId);
      expect(second.senderId).toBe(b.userId);

      // Ownership resolves correctly from each participant's perspective
      expect(isOwnMessage(first.senderId, viewer.userId)).toBe(viewer.userId === a.userId);
      expect(isOwnMessage(second.senderId, viewer.userId)).toBe(viewer.userId === b.userId);
    }
  });

  it("returns a stable, deterministic compatibility rating", async () => {
    const { a, matchId } = await createMatchedPair();

    const first = await request(app).get("/api/matches").set(auth(a.token)).expect(200);
    const second = await request(app).get("/api/matches").set(auth(a.token)).expect(200);

    const r1 = first.body.find((m: any) => m.id === matchId).compatibilityRating;
    const r2 = second.body.find((m: any) => m.id === matchId).compatibilityRating;
    expect(r1).toBe(r2);
    expect(r1).toBeGreaterThanOrEqual(60);
    expect(r1).toBeLessThanOrEqual(98);
  });
});

describe("removed prototype endpoints", () => {
  it("no longer exposes the fake subscription endpoint", async () => {
    const { a } = await createMatchedPair();
    const res = await request(app)
      .post("/api/subscription/subscribe")
      .set(auth(a.token))
      .send({ cardHolder: "X", billingAddress: "Y" });
    expect(res.status).toBe(404);
  });
});
