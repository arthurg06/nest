import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, auth, createMatchedPair, signup } from "./helpers";

const matchFor = async (token: string, matchId: string) => {
  const res = await request(app).get("/api/matches").set(auth(token)).expect(200);
  return res.body.find((m: any) => m.id === matchId);
};

describe("unread tracking and chat activity", () => {
  it("counts only the other member's messages, and only until marked read", async () => {
    const { a, b, matchId } = await createMatchedPair();

    // A fresh match starts read on both sides.
    expect((await matchFor(a.token, matchId)).unreadCount).toBe(0);
    expect((await matchFor(b.token, matchId)).unreadCount).toBe(0);

    await request(app).post(`/api/chats/${matchId}/messages`).set(auth(a.token)).send({ text: "hola!" }).expect(200);
    await request(app).post(`/api/chats/${matchId}/messages`).set(auth(a.token)).send({ text: "coffee?" }).expect(200);

    // The sender's own messages never flag her own conversation.
    expect((await matchFor(a.token, matchId)).unreadCount).toBe(0);
    // The recipient sees both as unread.
    expect((await matchFor(b.token, matchId)).unreadCount).toBe(2);

    // Opening the chat marks it read — persisted server-side.
    await request(app).post(`/api/chats/${matchId}/read`).set(auth(b.token)).expect(200);
    expect((await matchFor(b.token, matchId)).unreadCount).toBe(0);
    // ...and A's view is untouched by B's marker.
    expect((await matchFor(a.token, matchId)).unreadCount).toBe(0);
  });

  it("replying resets the replier's own unread state", async () => {
    const { a, b, matchId } = await createMatchedPair();
    await request(app).post(`/api/chats/${matchId}/messages`).set(auth(a.token)).send({ text: "hey" }).expect(200);
    expect((await matchFor(b.token, matchId)).unreadCount).toBe(1);

    // B replies without explicitly marking read — sending counts as reading.
    await request(app).post(`/api/chats/${matchId}/messages`).set(auth(b.token)).send({ text: "hey!" }).expect(200);
    expect((await matchFor(b.token, matchId)).unreadCount).toBe(0);
    // A now has B's reply unread.
    expect((await matchFor(a.token, matchId)).unreadCount).toBe(1);
  });

  it("only participants can mark a chat read", async () => {
    const { matchId } = await createMatchedPair();
    const outsider = await signup();
    await request(app).post(`/api/chats/${matchId}/read`).set(auth(outsider.token)).expect(403);
  });

  it("exposes a real last-activity timestamp that follows the newest message", async () => {
    const { a, matchId } = await createMatchedPair();
    const before = await matchFor(a.token, matchId);
    expect(before.lastActivityAt).toBe(before.createdAt);

    await request(app).post(`/api/chats/${matchId}/messages`).set(auth(a.token)).send({ text: "ping" }).expect(200);
    const after = await matchFor(a.token, matchId);
    expect(after.lastActivityAt).toBe(after.messages[after.messages.length - 1].createdAt);
    expect(new Date(after.lastActivityAt).getTime()).toBeGreaterThanOrEqual(new Date(before.lastActivityAt).getTime());
  });
});

describe("notification banner permanence", () => {
  it("keeps dismissed notifications dismissed — the poll returns only unread ones", async () => {
    const { a, matchId } = await createMatchedPair();
    void matchId;

    // Matching created an unread "you matched" notification.
    const fresh = await request(app).get("/api/poll").set(auth(a.token)).expect(200);
    expect(fresh.body.notifications.length).toBeGreaterThan(0);
    expect(fresh.body.notifications.every((n: any) => n.read === false)).toBe(true);

    // Dismiss = mark everything read.
    await request(app).post("/api/notifications/read").set(auth(a.token)).expect(200);

    // The next poll must NOT resurrect them.
    const later = await request(app).get("/api/poll").set(auth(a.token)).expect(200);
    expect(later.body.notifications).toHaveLength(0);
  });
});
