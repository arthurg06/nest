import { describe, it, expect } from "vitest";
import fs from "fs";
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

  it("rejects a link once its hour is up", async () => {
    const user = await signup();
    const token = await resetLinkFor(user.userId);

    // Age the stored record past its expiry directly in the test database.
    const db = JSON.parse(fs.readFileSync(process.env.DB_PATH!, "utf-8"));
    for (const r of db.passwordResets) {
      if (r.userId === user.userId) r.expiresAt = new Date(Date.now() - 1000).toISOString();
    }
    fs.writeFileSync(process.env.DB_PATH!, JSON.stringify(db));

    expect((await request(app).get(`/api/auth/reset-password/${token}`).expect(200)).body.valid).toBe(false);
    await request(app).post("/api/auth/reset-password").send({ token, password: "too-late-now-pw-1" }).expect(400);

    const admin = await getAdmin();
    const status = await request(app).get(`/api/admin/users/${user.userId}/reset-link`).set(auth(admin.token)).expect(200);
    expect(status.body).toMatchObject({ exists: true, active: false, used: false });
  });

  it("keeps an admin-issued link valid when forgot-password is used while email is off", async () => {
    // Email delivery is unconfigured in tests, so the self-service endpoint
    // must not mint an undeliverable token — doing so would invalidate the
    // admin-made link the member is about to receive.
    const user = await signup();
    const token = await resetLinkFor(user.userId);

    const res = await request(app).post("/api/auth/forgot-password").send({ email: user.email }).expect(200);
    expect(res.body.emailConfigured).toBe(false);

    // The admin link still works.
    await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "still-works-after-forgot-1" })
      .expect(200);
  });

  it("reports link status to admins only, without ever returning the token", async () => {
    const admin = await getAdmin();
    const user = await signup();

    // Admin-only, server-side enforced.
    await request(app).get(`/api/admin/users/${user.userId}/reset-link`).set(auth(user.token)).expect(403);
    await request(app).get(`/api/admin/users/${user.userId}/reset-link`).expect(401);

    // No link yet.
    const none = await request(app).get(`/api/admin/users/${user.userId}/reset-link`).set(auth(admin.token)).expect(200);
    expect(none.body.exists).toBe(false);

    // Active after issuing.
    const token = await resetLinkFor(user.userId);
    const active = await request(app).get(`/api/admin/users/${user.userId}/reset-link`).set(auth(admin.token)).expect(200);
    expect(active.body).toMatchObject({ exists: true, active: true, used: false, issuedBy: "admin" });
    expect(JSON.stringify(active.body)).not.toContain(token);

    // Spent after the member resets with it.
    await request(app).post("/api/auth/reset-password").send({ token, password: "status-check-pw-1" }).expect(200);
    const spent = await request(app).get(`/api/admin/users/${user.userId}/reset-link`).set(auth(admin.token)).expect(200);
    expect(spent.body).toMatchObject({ exists: true, active: false, used: true });
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
