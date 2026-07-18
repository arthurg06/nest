import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, auth, signup, createMatchedPair } from "./helpers";

describe("sign out", () => {
  it("invalidates the session but preserves the account and its data", async () => {
    const user = await signup();

    await request(app).post("/api/auth/logout").set(auth(user.token)).expect(200);

    // The old token can no longer be used
    await request(app).get("/api/auth/me").set(auth(user.token)).expect(401);

    // The account itself is intact: logging in again works and the profile survives
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "sup3r-secret-pw" })
      .expect(200);
    expect(login.body.profile.id).toBe(user.profileId);
  });

  it("does not invalidate other sessions of the same user", async () => {
    const user = await signup();
    const second = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "sup3r-secret-pw" })
      .expect(200);

    await request(app).post("/api/auth/logout").set(auth(user.token)).expect(200);

    await request(app).get("/api/auth/me").set(auth(second.body.token)).expect(200);
  });
});

describe("account deletion", () => {
  it("removes the account, its data, and all sessions", async () => {
    const { a, b, matchId } = await createMatchedPair();
    await request(app).post(`/api/chats/${matchId}/messages`).set(auth(a.token)).send({ text: "hola" }).expect(200);

    await request(app).delete("/api/users/me").set(auth(a.token)).expect(200);

    // Deleted sessions cannot be reused
    await request(app).get("/api/auth/me").set(auth(a.token)).expect(401);

    // Login is no longer possible
    await request(app)
      .post("/api/auth/login")
      .send({ email: a.email, password: "sup3r-secret-pw" })
      .expect(401);

    // The other user no longer sees the match or its messages
    const bMatches = await request(app).get("/api/matches").set(auth(b.token)).expect(200);
    expect(bMatches.body.find((m: any) => m.id === matchId)).toBeUndefined();
  });

  it("sign out and deletion are distinct: signing out first, the account still deletes only via the delete endpoint", async () => {
    const user = await signup();

    await request(app).post("/api/auth/logout").set(auth(user.token)).expect(200);

    // Account still exists after sign-out
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "sup3r-secret-pw" })
      .expect(200);

    await request(app).delete("/api/users/me").set(auth(login.body.token)).expect(200);
    await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "sup3r-secret-pw" })
      .expect(401);
  });
});
