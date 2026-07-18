import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, signup, getAdmin, auth, approveUser } from "./helpers";

// The personal (account) email and the university (verification) email are
// two different addresses with two different jobs. These tests pin the
// boundary: verification never touches credentials, and neither address is
// ever visible to other members.
describe("personal vs. university email separation", () => {
  it("keeps the account email and login unchanged when a different university email is submitted", async () => {
    const user = await signup();
    const universityEmail = `uni-${Date.now()}@student.example.edu`;
    expect(universityEmail).not.toBe(user.email);

    const submit = await request(app)
      .post("/api/verification/submit")
      .set(auth(user.token))
      .send({ university: "IE University", universityEmail })
      .expect(200);

    // Status is pending — submitting never verifies by itself
    expect(submit.body.profile.verificationStatus).toBe("pending");

    // The account email is untouched
    const me = await request(app).get("/api/auth/me").set(auth(user.token)).expect(200);
    expect(me.body.user.email).toBe(user.email);

    // Login keeps working with the personal email…
    await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "sup3r-secret-pw" })
      .expect(200);

    // …and the university email is NOT a login identifier
    await request(app)
      .post("/api/auth/login")
      .send({ email: universityEmail, password: "sup3r-secret-pw" })
      .expect(401);
  });

  it("creates no account for the submitted university email", async () => {
    const admin = await getAdmin();
    const user = await signup();
    const universityEmail = `uni-noacct-${Date.now()}@student.example.edu`;

    const before = await request(app).get("/api/admin/users").set(auth(admin.token)).expect(200);

    await request(app)
      .post("/api/verification/submit")
      .set(auth(user.token))
      .send({ university: "IE University", universityEmail })
      .expect(200);

    const after = await request(app).get("/api/admin/users").set(auth(admin.token)).expect(200);
    expect(after.body.length).toBe(before.body.length);
    expect(after.body.some((u: { email: string }) => u.email === universityEmail)).toBe(false);
  });

  it("shows admins the account email and university email as separate fields", async () => {
    const admin = await getAdmin();
    const user = await signup();
    const universityEmail = `uni-admin-${Date.now()}@student.example.edu`;

    await request(app)
      .post("/api/verification/submit")
      .set(auth(user.token))
      .send({ university: "Complutense", universityEmail })
      .expect(200);

    const res = await request(app)
      .get("/api/admin/verifications?status=pending")
      .set(auth(admin.token))
      .expect(200);

    const entry = res.body.find((v: { userId: string }) => v.userId === user.userId);
    expect(entry.email).toBe(user.email);
    expect(entry.verification.universityEmail).toBe(universityEmail);
    expect(entry.email).not.toBe(entry.verification.universityEmail);
  });

  it("never exposes either email to other members through discovery or matches", async () => {
    const viewer = await signup();
    const subject = await signup();
    await approveUser(viewer.userId);
    await approveUser(subject.userId);

    await request(app)
      .post("/api/verification/submit")
      .set(auth(subject.token))
      .send({ university: "IE University", universityEmail: `leak-${Date.now()}@student.example.edu` })
      .expect(400); // already approved — but even the stored record must never leak

    const discovery = await request(app).get("/api/profiles").set(auth(viewer.token)).expect(200);
    expect(discovery.body.length).toBeGreaterThan(0);
    for (const profile of discovery.body) {
      // verificationStatus (a bare enum, needed for the badge) is public;
      // the verification record and any email never are.
      expect(profile.verification).toBeUndefined();
      expect(profile.email).toBeUndefined();
    }
    const serialized = JSON.stringify(discovery.body);
    expect(serialized).not.toContain(subject.email);
    expect(serialized).not.toContain("universityEmail");
  });

  it("keeps login behavior identical through approval, rejection, and resubmission", async () => {
    const admin = await getAdmin();
    const user = await signup();
    const universityEmail = `uni-cycle-${Date.now()}@student.example.edu`;

    await request(app)
      .post("/api/verification/submit")
      .set(auth(user.token))
      .send({ university: "IE University", universityEmail })
      .expect(200);

    await request(app)
      .post(`/api/admin/verifications/${user.userId}/reject`)
      .set(auth(admin.token))
      .send({ reason: "Please use your official student address" })
      .expect(200);

    await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "sup3r-secret-pw" })
      .expect(200);

    // Resubmit with another university email, then approve
    await request(app)
      .post("/api/verification/submit")
      .set(auth(user.token))
      .send({ university: "IE University", universityEmail: `second-${universityEmail}` })
      .expect(200);

    await request(app)
      .post(`/api/admin/verifications/${user.userId}/approve`)
      .set(auth(admin.token))
      .expect(200);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "sup3r-secret-pw" })
      .expect(200);
    expect(login.body.user.email).toBe(user.email);
    expect(login.body.profile.verificationStatus).toBe("approved");
  });

  it("lets the owner see her own university email but never internal review fields", async () => {
    const user = await signup();
    const universityEmail = `uni-own-${Date.now()}@student.example.edu`;

    await request(app)
      .post("/api/verification/submit")
      .set(auth(user.token))
      .send({ university: "IE University", universityEmail })
      .expect(200);

    const me = await request(app).get("/api/auth/me").set(auth(user.token)).expect(200);
    expect(me.body.profile.verification.universityEmail).toBe(universityEmail);
    expect(me.body.profile.verification.adminNote).toBeUndefined();
    expect(me.body.profile.verification.reviewedById).toBeUndefined();
  });
});
