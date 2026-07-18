import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, signup, getAdmin, auth } from "./helpers";

// The reset link is the only way back into an account, so these tests pin
// both that it works and that it cannot be abused.
async function resetLinkFor(userId: string): Promise<string> {
  const admin = await getAdmin();
  const res = await request(app)
    .post(`/api/admin/users/${userId}/reset-link`)
    .set(auth(admin.token))
    .expect(200);
  return new URL(res.body.resetUrl).searchParams.get("reset")!;
}

describe("password recovery", () => {
  it("never reveals whether an address is registered", async () => {
    const user = await signup();

    const known = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: user.email })
      .expect(200);

    const unknown = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nobody-here@nest.test" })
      .expect(200);

    expect(known.body.message).toBe(unknown.body.message);
    expect(known.body.success).toBe(unknown.body.success);
  });

  it("lets a member set a new password and sign in with it", async () => {
    const user = await signup();
    const token = await resetLinkFor(user.userId);

    expect((await request(app).get(`/api/auth/reset-password/${token}`).expect(200)).body.valid).toBe(true);

    await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "brand-new-password-1" })
      .expect(200);

    await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "brand-new-password-1" })
      .expect(200);

    // the old password no longer works
    await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "sup3r-secret-pw" })
      .expect(401);
  });

  it("signs out every existing session when the password changes", async () => {
    const user = await signup();
    await request(app).get("/api/auth/me").set(auth(user.token)).expect(200);

    const token = await resetLinkFor(user.userId);
    await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "another-new-password-1" })
      .expect(200);

    // the session she held before the reset is dead
    await request(app).get("/api/auth/me").set(auth(user.token)).expect(401);
  });

  it("burns the token after one use", async () => {
    const user = await signup();
    const token = await resetLinkFor(user.userId);

    await request(app).post("/api/auth/reset-password").send({ token, password: "first-new-password-1" }).expect(200);
    await request(app).post("/api/auth/reset-password").send({ token, password: "second-attempt-pw-1" }).expect(400);

    expect((await request(app).get(`/api/auth/reset-password/${token}`).expect(200)).body.valid).toBe(false);
  });

  it("invalidates an earlier link when a new one is issued", async () => {
    const user = await signup();
    const first = await resetLinkFor(user.userId);
    const second = await resetLinkFor(user.userId);

    await request(app).post("/api/auth/reset-password").send({ token: first, password: "should-not-work-1" }).expect(400);
    await request(app).post("/api/auth/reset-password").send({ token: second, password: "this-one-works-1" }).expect(200);
  });

  it("rejects made-up tokens and weak passwords", async () => {
    const user = await signup();

    await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "not-a-real-token", password: "long-enough-pw-1" })
      .expect(400);

    const token = await resetLinkFor(user.userId);
    await request(app).post("/api/auth/reset-password").send({ token, password: "short" }).expect(400);

    // the token survives a rejected attempt
    expect((await request(app).get(`/api/auth/reset-password/${token}`).expect(200)).body.valid).toBe(true);
  });

  it("only admins can generate a reset link for someone else", async () => {
    const user = await signup();
    const other = await signup();

    await request(app)
      .post(`/api/admin/users/${user.userId}/reset-link`)
      .set(auth(other.token))
      .expect(403);
  });

  it("refuses to reset a suspended account", async () => {
    const admin = await getAdmin();
    const user = await signup();
    const token = await resetLinkFor(user.userId);

    await request(app)
      .post(`/api/admin/users/${user.userId}/suspend`)
      .set(auth(admin.token))
      .expect(200);

    await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "suspended-cannot-1" })
      .expect(403);
  });
});
