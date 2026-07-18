import { describe, it, expect } from "vitest";
import { computeChanges, COLLECTIONS } from "../server/storage/diff";
import { selectBackend, activeStorageKind } from "../server/storage/index";
import type { DbSchema } from "../server/db";

function emptyDb(): DbSchema {
  return {
    users: [],
    profiles: [],
    swipes: [],
    matches: [],
    messages: [],
    plans: [],
    recommendations: [],
    events: [],
    rsvps: [],
    posts: [],
    notifications: [],
    sessions: [],
    passwordResets: [],
    adminAudit: [],
    processedStripeEvents: [],
  };
}

const user = (id: string, email: string) =>
  ({ id, email, passwordHash: "scrypt$test", isAdmin: false, role: "member", status: "active", source: "web", isPremium: false, createdAt: "2026-01-01T00:00:00.000Z" }) as DbSchema["users"][number];

describe("storage diff", () => {
  it("produces no operations for identical snapshots", () => {
    const prev = emptyDb();
    prev.users.push(user("u1", "a@nest.test"));
    const next = structuredClone(prev);

    const { upserts, deletes } = computeChanges(prev, next);
    expect(upserts).toEqual([]);
    expect(deletes).toEqual([]);
  });

  it("upserts only the rows that changed", () => {
    const prev = emptyDb();
    prev.users.push(user("u1", "a@nest.test"), user("u2", "b@nest.test"));
    const next = structuredClone(prev);
    next.users[1].isPremium = true;
    next.messages.push({ id: "m1", matchId: "x", senderId: "u1", text: "hi", timestamp: "t", createdAt: "t" });

    const { upserts, deletes } = computeChanges(prev, next);
    expect(deletes).toEqual([]);
    expect(upserts.map(u => `${u.collection}/${u.id}`).sort()).toEqual(["messages/m1", "users/u2"]);
  });

  it("deletes removed rows, keying sessions by token", () => {
    const prev = emptyDb();
    prev.sessions.push({ token: "tok-1", userId: "u1", expiresAt: "2099-01-01" });
    prev.sessions.push({ token: "tok-2", userId: "u1", expiresAt: "2099-01-01" });
    const next = structuredClone(prev);
    next.sessions = next.sessions.filter(s => s.token !== "tok-1");

    const { upserts, deletes } = computeChanges(prev, next);
    expect(upserts).toEqual([]);
    expect(deletes).toEqual([{ collection: "sessions", id: "tok-1" }]);
  });

  it("treats processedStripeEvents values as their own keys", () => {
    const prev = emptyDb();
    prev.processedStripeEvents.push("evt_1", "evt_2");
    const next = structuredClone(prev);
    next.processedStripeEvents = ["evt_2", "evt_3"]; // evt_1 aged out, evt_3 arrived

    const { upserts, deletes } = computeChanges(prev, next);
    expect(upserts).toEqual([{ collection: "processedStripeEvents", id: "evt_3", data: JSON.stringify("evt_3") }]);
    expect(deletes).toEqual([{ collection: "processedStripeEvents", id: "evt_1" }]);
  });

  it("upserts every row on a full sync (no baseline)", () => {
    const next = emptyDb();
    next.users.push(user("u1", "a@nest.test"));
    next.profiles.push({ id: "p1", userId: "u1" } as DbSchema["profiles"][number]);

    const { upserts, deletes } = computeChanges(null, next);
    expect(deletes).toEqual([]);
    expect(upserts.map(u => u.collection).sort()).toEqual(["profiles", "users"]);
  });

  it("covers every collection in the schema", () => {
    expect(COLLECTIONS.sort()).toEqual(Object.keys(emptyDb()).sort());
  });
});

describe("backend selection", () => {
  it("always uses the file backend under tests, even with a database URL set", () => {
    process.env.DATABASE_URL = "postgres://example.invalid/db";
    try {
      expect(selectBackend().kind).toBe("file");
      expect(activeStorageKind()).toBe("file");
    } finally {
      delete process.env.DATABASE_URL;
    }
  });
});
