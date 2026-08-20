import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, signup, auth } from "./helpers";

// The helper signs everyone up with this password (tests/helpers.ts).
const ORIGINAL_PW = "sup3r-secret-pw";

describe("change password", () => {
  it("requires authentication", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .send({ currentPassword: ORIGINAL_PW, newPassword: "another-pw" });
    expect(res.status).toBe(401);
  });

  it("rejects a wrong current password", async () => {
    const user = await signup();
    const res = await request(app)
      .post("/api/auth/change-password")
      .set(auth(user.token))
      .send({ currentPassword: "not-the-password", newPassword: "another-pw" });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Current password/);
  });

  it("rejects a new password shorter than 6 characters", async () => {
    const user = await signup();
    const res = await request(app)
      .post("/api/auth/change-password")
      .set(auth(user.token))
      .send({ currentPassword: ORIGINAL_PW, newPassword: "abc" });
    expect(res.status).toBe(400);
  });

  it("changes the password, keeps this session, and revokes the others", async () => {
    const user = await signup();

    // Open a second session for the same account before the change.
    const secondLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: ORIGINAL_PW });
    expect(secondLogin.status).toBe(200);
    const otherToken = secondLogin.body.token;

    const change = await request(app)
      .post("/api/auth/change-password")
      .set(auth(user.token))
      .send({ currentPassword: ORIGINAL_PW, newPassword: "brand-new-pw" });
    expect(change.status).toBe(200);

    // The old password stops working, the new one works.
    const oldPw = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: ORIGINAL_PW });
    expect(oldPw.status).toBe(401);

    const newPw = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "brand-new-pw" });
    expect(newPw.status).toBe(200);

    // The session that made the change survives; the other one is revoked.
    const me = await request(app).get("/api/auth/me").set(auth(user.token));
    expect(me.status).toBe(200);

    const revoked = await request(app).get("/api/auth/me").set(auth(otherToken));
    expect(revoked.status).toBe(401);
  });
});
