import { describe, it, expect } from "vitest";
import fs from "fs";
import request from "supertest";
import { app, auth, signup, getAdmin, approveUser } from "./helpers";

const submitBody = {
  university: "IE University",
  universityEmail: "someone@student.ie.edu",
  note: "Exchange student"
};

function readTestDb() {
  return JSON.parse(fs.readFileSync(process.env.DB_PATH!, "utf-8"));
}

describe("verification lifecycle", () => {
  it("new accounts start unsubmitted and are hidden from discovery", async () => {
    const viewer = await signup();
    await approveUser(viewer.userId);
    const newcomer = await signup();

    const me = await request(app).get("/api/auth/me").set(auth(newcomer.token)).expect(200);
    expect(me.body.profile.verificationStatus).toBe("unsubmitted");
    expect(me.body.profile.isVerified).toBe(false);

    const discovery = await request(app).get("/api/profiles").set(auth(viewer.token)).expect(200);
    expect(discovery.body.find((p: any) => p.userId === newcomer.userId)).toBeUndefined();
  });

  it("submitting details makes the account pending — never approved", async () => {
    const user = await signup();

    const res = await request(app)
      .post("/api/verification/submit")
      .set(auth(user.token))
      .send(submitBody)
      .expect(200);

    expect(res.body.profile.verificationStatus).toBe("pending");
    expect(res.body.profile.isVerified).toBe(false);

    // Still hidden from discovery while pending
    const viewer = await signup();
    await approveUser(viewer.userId);
    const discovery = await request(app).get("/api/profiles").set(auth(viewer.token)).expect(200);
    expect(discovery.body.find((p: any) => p.userId === user.userId)).toBeUndefined();
  });

  it("pending users cannot initiate matching", async () => {
    const pending = await signup();
    await request(app).post("/api/verification/submit").set(auth(pending.token)).send(submitBody).expect(200);

    const target = await signup();
    await approveUser(target.userId);

    const res = await request(app)
      .post("/api/swipe")
      .set(auth(pending.token))
      .send({ toUserId: target.userId, action: "like" });
    expect(res.status).toBe(403);
    expect(res.body.requiresVerification).toBe(true);
  });

  it("regular users cannot approve themselves or others", async () => {
    const user = await signup();
    await request(app).post("/api/verification/submit").set(auth(user.token)).send(submitBody).expect(200);

    const self = await request(app)
      .post(`/api/admin/verifications/${user.userId}/approve`)
      .set(auth(user.token));
    expect(self.status).toBe(403);

    const other = await signup();
    const cross = await request(app)
      .post(`/api/admin/verifications/${other.userId}/approve`)
      .set(auth(user.token));
    expect(cross.status).toBe(403);

    // And the profile-update endpoint cannot flip verification fields
    await request(app)
      .post("/api/profiles/update")
      .set(auth(user.token))
      .send({ isVerified: true, verificationStatus: "approved" })
      .expect(200);
    const me = await request(app).get("/api/auth/me").set(auth(user.token)).expect(200);
    expect(me.body.profile.verificationStatus).toBe("pending");
    expect(me.body.profile.isVerified).toBe(false);
  });

  it("admin approval makes the member discoverable and notifies her", async () => {
    const user = await signup();
    await request(app).post("/api/verification/submit").set(auth(user.token)).send(submitBody).expect(200);

    const admin = await getAdmin();
    const queue = await request(app).get("/api/admin/verifications?status=pending").set(auth(admin.token)).expect(200);
    expect(queue.body.find((v: any) => v.userId === user.userId)).toBeTruthy();

    await request(app).post(`/api/admin/verifications/${user.userId}/approve`).set(auth(admin.token)).expect(200);

    const me = await request(app).get("/api/auth/me").set(auth(user.token)).expect(200);
    expect(me.body.profile.verificationStatus).toBe("approved");
    expect(me.body.profile.isVerified).toBe(true);

    const viewer = await signup();
    await approveUser(viewer.userId);
    const discovery = await request(app).get("/api/profiles").set(auth(viewer.token)).expect(200);
    expect(discovery.body.find((p: any) => p.userId === user.userId)).toBeTruthy();

    const notifications = await request(app).get("/api/notifications").set(auth(user.token)).expect(200);
    expect(notifications.body.some((n: any) => n.text.includes("approved"))).toBe(true);
  });

  it("admin rejection stores a member-visible reason but keeps admin fields internal", async () => {
    const user = await signup();
    await request(app).post("/api/verification/submit").set(auth(user.token)).send(submitBody).expect(200);

    const admin = await getAdmin();
    await request(app)
      .post(`/api/admin/verifications/${user.userId}/reject`)
      .set(auth(admin.token))
      .send({ reason: "The email provided is not a university address.", adminNote: "Domain is gmail.com" })
      .expect(200);

    const me = await request(app).get("/api/auth/me").set(auth(user.token)).expect(200);
    expect(me.body.profile.verificationStatus).toBe("rejected");
    expect(me.body.profile.verification.rejectionReason).toContain("university address");
    // Internal fields never reach the member
    expect(JSON.stringify(me.body)).not.toContain("Domain is gmail.com");
    expect(me.body.profile.verification.reviewedById).toBeUndefined();

    // Rejection requires a reason
    const noReason = await request(app)
      .post(`/api/admin/verifications/${user.userId}/reject`)
      .set(auth(admin.token))
      .send({});
    expect(noReason.status).toBe(400);

    // Rejected members can resubmit
    await request(app).post("/api/verification/submit").set(auth(user.token)).send(submitBody).expect(200);
    const after = await request(app).get("/api/auth/me").set(auth(user.token)).expect(200);
    expect(after.body.profile.verificationStatus).toBe("pending");
  });

  it("records an audit trail for admin decisions", async () => {
    const user = await signup();
    await request(app).post("/api/verification/submit").set(auth(user.token)).send(submitBody).expect(200);
    const admin = await getAdmin();
    await request(app).post(`/api/admin/verifications/${user.userId}/approve`).set(auth(admin.token)).expect(200);

    const db = readTestDb();
    const entry = db.adminAudit.find(
      (e: any) => e.action === "verification.approve" && e.targetUserId === user.userId
    );
    expect(entry).toBeTruthy();
    expect(entry.adminId).toBe(admin.userId);
  });
});

describe("suspension", () => {
  it("suspended members lose access and disappear from discovery", async () => {
    const user = await signup();
    await approveUser(user.userId);
    const viewer = await signup();
    await approveUser(viewer.userId);

    const admin = await getAdmin();
    await request(app).post(`/api/admin/users/${user.userId}/suspend`).set(auth(admin.token)).expect(200);

    // Existing sessions were revoked; a fresh login is blocked by status
    await request(app).get("/api/auth/me").set(auth(user.token)).expect(401);
    const relogin = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "sup3r-secret-pw" });
    // Login succeeds token-wise or is blocked — either way the API is unusable:
    if (relogin.status === 200) {
      await request(app).get("/api/auth/me").set(auth(relogin.body.token)).expect(403);
    }

    const discovery = await request(app).get("/api/profiles").set(auth(viewer.token)).expect(200);
    expect(discovery.body.find((p: any) => p.userId === user.userId)).toBeUndefined();

    // Restore brings her back
    await request(app).post(`/api/admin/users/${user.userId}/restore`).set(auth(admin.token)).expect(200);
    const discoveryAfter = await request(app).get("/api/profiles").set(auth(viewer.token)).expect(200);
    expect(discoveryAfter.body.find((p: any) => p.userId === user.userId)).toBeTruthy();
  });
});
