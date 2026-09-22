import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, signup, auth } from "./helpers";

// The combined background-refresh endpoint: one request (and one database
// read) for everything the client polls, replacing separate matches +
// notifications calls.
describe("combined poll refresh", () => {
  it("requires authentication", async () => {
    await request(app).get("/api/poll").expect(401);
  });

  it("returns the same payloads as the separate endpoints", async () => {
    const user = await signup();

    const poll = await request(app).get("/api/poll").set(auth(user.token)).expect(200);
    expect(Array.isArray(poll.body.matches)).toBe(true);
    expect(Array.isArray(poll.body.notifications)).toBe(true);

    const matches = await request(app).get("/api/matches").set(auth(user.token)).expect(200);
    const notifications = await request(app).get("/api/notifications").set(auth(user.token)).expect(200);
    expect(poll.body.matches).toEqual(matches.body);
    expect(poll.body.notifications).toEqual(notifications.body);
  });
});
