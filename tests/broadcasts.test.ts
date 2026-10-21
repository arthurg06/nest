import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import request from "supertest";
import { app, auth, signup, getAdmin, createMatchedPair, TestUser } from "./helpers";
import { __setPushForTests } from "../server/push";
import { __setBroadcastKnobsForTests } from "../server";

// Delivery-logic tests: push is marked configured and the transport is a
// fake, so what reaches "the push service" is fully observable without any
// network. Authorization/validation behavior with push UNconfigured lives in
// push.test.ts.

interface SentPush {
  endpoint: string;
  payload: { title: string; body: string; url: string; tag: string };
}

let sent: SentPush[] = [];
/** Per-endpoint failure injection: return a status code to throw, null to accept. */
let failWith: ((endpoint: string) => number | null) | null = null;

const fakeDeliver = async (sub: { endpoint: string }, payload: string) => {
  const code = failWith ? failWith(sub.endpoint) : null;
  if (code) {
    const err: any = new Error(`push service says ${code}`);
    err.statusCode = code;
    throw err;
  }
  sent.push({ endpoint: sub.endpoint, payload: JSON.parse(payload) });
};

// Subscriptions registered by a test, removed afterwards so broadcasts in
// later tests don't fan out to earlier tests' devices.
let devices: { user: TestUser; endpoint: string }[] = [];

async function subscribeDevice(user: TestUser, endpoint: string): Promise<void> {
  await request(app)
    .post("/api/push/subscribe")
    .set(auth(user.token))
    .send({ subscription: { endpoint, keys: { p256dh: "pk", auth: "ak" } } })
    .expect(200);
  devices.push({ user, endpoint });
}

let endpointCounter = 0;
const newEndpoint = () => `https://push.example.com/device-${++endpointCounter}`;

const sendAnnouncement = (adminToken: string, body: Record<string, unknown>) =>
  request(app)
    .post("/api/admin/announcements")
    .set(auth(adminToken))
    .send({ idempotencyKey: `test-key-${Math.random().toString(36).slice(2, 14)}`, ...body });

beforeEach(() => {
  sent = [];
  failWith = null;
  __setPushForTests({ configured: true, deliver: fakeDeliver });
  __setBroadcastKnobsForTests({ budgetMs: 8000, staleMs: 0 });
});

afterEach(async () => {
  for (const d of devices) {
    await request(app).post("/api/push/unsubscribe").set(auth(d.user.token)).send({ endpoint: d.endpoint });
  }
  devices = [];
});

afterAll(() => {
  __setPushForTests({ configured: false, deliver: null });
});

describe("admin announcements", () => {
  it("is admin-only, server-enforced", async () => {
    const anon = await request(app).post("/api/admin/announcements").send({ title: "x", message: "y" });
    expect(anon.status).toBe(401);

    const member = await signup();
    const asMember = await request(app)
      .post("/api/admin/announcements")
      .set(auth(member.token))
      .send({ title: "x", message: "y", idempotencyKey: "memberkey1" });
    expect(asMember.status).toBe(403);

    const anonList = await request(app).get("/api/admin/announcements");
    expect(anonList.status).toBe(401);
    const memberList = await request(app).get("/api/admin/announcements").set(auth(member.token));
    expect(memberList.status).toBe(403);
  });

  it("validates title, message, destination, and idempotency key", async () => {
    const admin = await getAdmin();
    for (const bad of [
      { message: "no title", idempotencyKey: "validkey123" },
      { title: "no message", idempotencyKey: "validkey123" },
      { title: "t", message: "m", url: "https://evil.example.com/phish", idempotencyKey: "validkey123" },
      { title: "t", message: "m", url: "nota/path", idempotencyKey: "validkey123" },
      { title: "t", message: "m" }, // no idempotency key
      { title: "t", message: "m", idempotencyKey: "x" } // too short
    ]) {
      const res = await request(app).post("/api/admin/announcements").set(auth(admin.token)).send(bad);
      expect(res.status).toBe(400);
    }
    expect(sent).toHaveLength(0);
  });

  it("refuses honestly when push is not configured", async () => {
    __setPushForTests({ configured: false });
    const admin = await getAdmin();
    const res = await sendAnnouncement(admin.token, { title: "t", message: "m" });
    expect(res.status).toBe(503);
  });

  it("delivers to subscribed members, honors the announcements preference, and reports truthfully", async () => {
    const admin = await getAdmin();
    const wants = await signup();
    const optedOut = await signup();
    await signup(); // eligible but has no device — must appear only in counts

    const wantsEndpoint = newEndpoint();
    const optedOutEndpoint = newEndpoint();
    await subscribeDevice(wants, wantsEndpoint);
    await subscribeDevice(optedOut, optedOutEndpoint);
    await request(app)
      .post("/api/notifications/preferences")
      .set(auth(optedOut.token))
      .send({ preferences: { announcements: false } })
      .expect(200);

    const res = await sendAnnouncement(admin.token, {
      title: "Something exciting ✨",
      message: "Check out what's new on NEST!",
      url: "/?open=events"
    });
    expect(res.status).toBe(200);
    expect(res.body.duplicate).toBe(false);

    const endpoints = sent.map(s => s.endpoint);
    expect(endpoints).toContain(wantsEndpoint);
    expect(endpoints).not.toContain(optedOutEndpoint);

    const note = sent.find(s => s.endpoint === wantsEndpoint)!;
    expect(note.payload.title).toBe("Something exciting ✨");
    expect(note.payload.body).toBe("Check out what's new on NEST!");
    expect(note.payload.url).toBe("/?open=events");

    const job = res.body.job;
    expect(job.status).toBe("done");
    expect(job.accepted).toBe(sent.length);
    expect(job.failed).toBe(0);
    expect(job.pending).toBe(0);
    // Truthful reach: more members eligible than actually subscribed.
    expect(job.eligibleMembers).toBeGreaterThan(job.subscribedMembers);
    expect(job.subscribedMembers).toBeGreaterThanOrEqual(1);
    // Never leak endpoints or key material to the admin panel.
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain("push.example.com");
    expect(raw).not.toContain("p256dh");
  });

  it("never sends the same announcement twice for one idempotency key", async () => {
    const admin = await getAdmin();
    const member = await signup();
    await subscribeDevice(member, newEndpoint());

    const body = { title: "Once only", message: "No double sends.", idempotencyKey: "dupekey-abc123" };
    const first = await request(app).post("/api/admin/announcements").set(auth(admin.token)).send(body).expect(200);
    const after = sent.length;
    const second = await request(app).post("/api/admin/announcements").set(auth(admin.token)).send(body).expect(200);

    expect(first.body.duplicate).toBe(false);
    expect(second.body.duplicate).toBe(true);
    expect(second.body.job.id).toBe(first.body.job.id);
    expect(sent.length).toBe(after);
  });

  it("counts expired subscriptions, prunes them, and keeps delivering to the rest", async () => {
    const admin = await getAdmin();
    const healthy = await signup();
    const gone = await signup();
    const flaky = await signup();
    const healthyEndpoint = newEndpoint();
    const goneEndpoint = newEndpoint();
    const flakyEndpoint = newEndpoint();
    await subscribeDevice(healthy, healthyEndpoint);
    await subscribeDevice(gone, goneEndpoint);
    await subscribeDevice(flaky, flakyEndpoint);

    failWith = endpoint => (endpoint === goneEndpoint ? 410 : endpoint === flakyEndpoint ? 500 : null);

    const res = await sendAnnouncement(admin.token, { title: "Mixed luck", message: "Some devices are gone." });
    expect(res.status).toBe(200);
    const job = res.body.job;
    expect(job.expired).toBe(1);
    expect(job.failed).toBe(1);
    expect(sent.map(s => s.endpoint)).toContain(healthyEndpoint);

    // The dead endpoint was pruned; the transient failure was kept.
    const goneStatus = await request(app).get("/api/notifications/preferences").set(auth(gone.token)).expect(200);
    expect(goneStatus.body.hasSubscription).toBe(false);
    const flakyStatus = await request(app).get("/api/notifications/preferences").set(auth(flaky.token)).expect(200);
    expect(flakyStatus.body.hasSubscription).toBe(true);
  });

  it("resumes an interrupted delivery without re-sending from the top", async () => {
    const admin = await getAdmin();
    const member = await signup();
    const endpoint = newEndpoint();
    await subscribeDevice(member, endpoint);

    // Zero budget: the job is created and persisted, but no chunk is sent —
    // exactly what a serverless timeout right after the trigger looks like.
    __setBroadcastKnobsForTests({ budgetMs: 0 });
    const res = await sendAnnouncement(admin.token, { title: "Interrupted", message: "Deliver me later." });
    expect(res.status).toBe(200);
    expect(res.body.job.status).toBe("processing");
    expect(res.body.job.pending).toBeGreaterThan(0);
    expect(sent).toHaveLength(0);

    // The next admin visit (or the daily cron) picks the job up again.
    __setBroadcastKnobsForTests({ budgetMs: 8000, staleMs: 0 });
    const list = await request(app).get("/api/admin/announcements").set(auth(admin.token)).expect(200);
    const job = list.body.jobs.find((j: any) => j.id === res.body.job.id);
    expect(job.status).toBe("done");
    expect(job.pending).toBe(0);
    expect(sent.map(s => s.endpoint)).toContain(endpoint);
    expect(sent.filter(s => s.endpoint === endpoint)).toHaveLength(1);
  });
});

describe("new Experience announcements", () => {
  const eventBody = {
    title: "Sunset Picnic Among Friends",
    description: "Golden hour at the lake.",
    date: "Saturday, Nov 28",
    time: "18:00",
    location: "Retiro",
    category: "social",
    price: "€12"
  };

  it("publishing an event notifies opted-in subscribed members with a deep link", async () => {
    const admin = await getAdmin();
    const member = await signup();
    const optedOut = await signup();
    const memberEndpoint = newEndpoint();
    const optedOutEndpoint = newEndpoint();
    await subscribeDevice(member, memberEndpoint);
    await subscribeDevice(optedOut, optedOutEndpoint);
    await request(app)
      .post("/api/notifications/preferences")
      .set(auth(optedOut.token))
      .send({ preferences: { experiences: false } })
      .expect(200);

    const created = await request(app).post("/api/events").set(auth(admin.token)).send(eventBody).expect(200);

    const note = sent.find(s => s.endpoint === memberEndpoint);
    expect(note).toBeDefined();
    expect(note!.payload.title).toBe("New on NEST ✨");
    expect(note!.payload.body).toContain("Sunset Picnic Among Friends");
    expect(note!.payload.url).toBe(`/?open=events&event=${created.body.id}`);
    expect(sent.map(s => s.endpoint)).not.toContain(optedOutEndpoint);

    // The broadcast shows up in the admin history as an experience job.
    const list = await request(app).get("/api/admin/announcements").set(auth(admin.token)).expect(200);
    const job = list.body.jobs.find((j: any) => j.type === "experience" && j.body.includes("Sunset Picnic"));
    expect(job).toBeDefined();
    expect(job.status).toBe("done");

    // Creating the event announced it exactly once; nothing re-announces it.
    expect(sent.filter(s => s.endpoint === memberEndpoint)).toHaveLength(1);
  });

  it("deleting an event cancels its still-pending announcement", async () => {
    const admin = await getAdmin();
    const member = await signup();
    await subscribeDevice(member, newEndpoint());

    __setBroadcastKnobsForTests({ budgetMs: 0 });
    const created = await request(app)
      .post("/api/events")
      .set(auth(admin.token))
      .send({ ...eventBody, title: "Doomed Event" })
      .expect(200);
    expect(sent).toHaveLength(0);

    await request(app).delete(`/api/events/${created.body.id}`).set(auth(admin.token)).expect(200);

    __setBroadcastKnobsForTests({ budgetMs: 8000, staleMs: 0 });
    const list = await request(app).get("/api/admin/announcements").set(auth(admin.token)).expect(200);
    const job = list.body.jobs.find((j: any) => j.body.includes("Doomed Event"));
    expect(job.status).toBe("cancelled");
    expect(job.pending).toBe(0);
    // The cancelled announcement never went out, not even on resume.
    expect(sent.filter(s => s.payload.body.includes("Doomed Event"))).toHaveLength(0);
  });
});

describe("match and message pushes (inline, single-recipient)", () => {
  it("a new match pushes to both members; a plain like never sends a match push", async () => {
    const admin = await getAdmin();
    const a = await signup();
    const b = await signup();
    await request(app).post(`/api/admin/verifications/${a.userId}/approve`).set(auth(admin.token)).expect(200);
    await request(app).post(`/api/admin/verifications/${b.userId}/approve`).set(auth(admin.token)).expect(200);
    const aEndpoint = newEndpoint();
    const bEndpoint = newEndpoint();
    await subscribeDevice(a, aEndpoint);
    await subscribeDevice(b, bEndpoint);

    await request(app).post("/api/swipe").set(auth(a.token)).send({ toUserId: b.userId, action: "like" }).expect(200);
    // One-sided like: b may get a "someone liked you" nudge, never a match.
    expect(sent.filter(s => s.payload.title.includes("match"))).toHaveLength(0);

    sent = [];
    const match = await request(app).post("/api/swipe").set(auth(b.token)).send({ toUserId: a.userId, action: "like" }).expect(200);
    expect(match.body.isMatch).toBe(true);

    const matchPushes = sent.filter(s => s.payload.title === "It's a match! 💕");
    expect(matchPushes.map(s => s.endpoint).sort()).toEqual([aEndpoint, bEndpoint].sort());
    for (const p of matchPushes) {
      expect(p.payload.url).toBe(`/?open=chat&match=${match.body.matchId}`);
    }
  });

  it("a new message pushes only to the recipient and never carries the message text", async () => {
    const { a, b, matchId } = await createMatchedPair();
    const aEndpoint = newEndpoint();
    const bEndpoint = newEndpoint();
    await subscribeDevice(a, aEndpoint);
    await subscribeDevice(b, bEndpoint);
    sent = [];

    await request(app)
      .post(`/api/chats/${matchId}/messages`)
      .set(auth(a.token))
      .send({ text: "my extremely private plan" })
      .expect(200);

    expect(sent).toHaveLength(1);
    expect(sent[0].endpoint).toBe(bEndpoint);
    expect(sent[0].payload.url).toBe(`/?open=chat&match=${matchId}`);
    expect(JSON.stringify(sent[0].payload)).not.toContain("extremely private plan");
  });
});

describe("subscription lifecycle with push configured", () => {
  it("upserts by endpoint, reassigns on account switch, and detaches on request", async () => {
    const first = await signup();
    const second = await signup();
    const endpoint = newEndpoint();

    // Same device, first account.
    await subscribeDevice(first, endpoint);
    const again = await request(app)
      .post("/api/push/subscribe")
      .set(auth(first.token))
      .send({ subscription: { endpoint, keys: { p256dh: "pk", auth: "ak" } } })
      .expect(200);
    expect(again.body.success).toBe(true);
    const firstPrefs = await request(app).get("/api/notifications/preferences").set(auth(first.token)).expect(200);
    expect(firstPrefs.body.hasSubscription).toBe(true);

    // The same browser signs into another account: the endpoint moves with it
    // (shared-device safety — no duplicate row, no cross-account delivery).
    await request(app)
      .post("/api/push/subscribe")
      .set(auth(second.token))
      .send({ subscription: { endpoint, keys: { p256dh: "pk", auth: "ak" } } })
      .expect(200);
    const firstAfter = await request(app).get("/api/notifications/preferences").set(auth(first.token)).expect(200);
    expect(firstAfter.body.hasSubscription).toBe(false);
    const secondAfter = await request(app).get("/api/notifications/preferences").set(auth(second.token)).expect(200);
    expect(secondAfter.body.hasSubscription).toBe(true);

    // Sign-out detaches the device from the account.
    await request(app).post("/api/push/unsubscribe").set(auth(second.token)).send({ endpoint }).expect(200);
    const secondFinal = await request(app).get("/api/notifications/preferences").set(auth(second.token)).expect(200);
    expect(secondFinal.body.hasSubscription).toBe(false);
  });

  it("account deletion removes the member's subscriptions with everything else", async () => {
    const admin = await getAdmin();
    const leaving = await signup();
    const endpoint = newEndpoint();
    await subscribeDevice(leaving, endpoint);
    devices = devices.filter(d => d.endpoint !== endpoint); // her token dies with the account

    await request(app).delete("/api/users/me").set(auth(leaving.token)).expect(200);

    // Broadcasts no longer reach the deleted account's device.
    await sendAnnouncement(admin.token, { title: "After deletion", message: "Should skip removed devices." });
    expect(sent.map(s => s.endpoint)).not.toContain(endpoint);
  });
});
