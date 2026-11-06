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
  // Visibility rule (2026-07-19): every ACTIVE member is discoverable
  // regardless of verification status; only approved members are marked as
  // verified, and suspended accounts stay hidden.
  it("new accounts start unsubmitted but are still discoverable", async () => {
    const viewer = await signup();
    await approveUser(viewer.userId);
    const newcomer = await signup();

    const me = await request(app).get("/api/auth/me").set(auth(newcomer.token)).expect(200);
    expect(me.body.profile.verificationStatus).toBe("unsubmitted");
    expect(me.body.profile.isVerified).toBe(false);

    const discovery = await request(app).get("/api/profiles").set(auth(viewer.token)).expect(200);
    const seen = discovery.body.find((p: any) => p.userId === newcomer.userId);
    expect(seen).toBeDefined();
    // …but she carries no verified marker until an admin approves her
    expect(seen.isVerified).toBe(false);
    expect(seen.verificationStatus).toBe("unsubmitted");
  });

  it("suspended members disappear from discovery whatever their verification", async () => {
    const admin = await getAdmin();
    const viewer = await signup();
    const target = await signup();
    await approveUser(target.userId);

    await request(app)
      .post(`/api/admin/users/${target.userId}/suspend`)
      .set(auth(admin.token))
      .expect(200);

    const discovery = await request(app).get("/api/profiles").set(auth(viewer.token)).expect(200);
    expect(discovery.body.find((p: any) => p.userId === target.userId)).toBeUndefined();

    // and she cannot be swiped either
    await request(app)
      .post("/api/swipe")
      .set(auth(viewer.token))
      .send({ toUserId: target.userId, action: "like" })
      .expect(403);
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

    // Visible while pending, but not marked verified
    const viewer = await signup();
    await approveUser(viewer.userId);
    const discovery = await request(app).get("/api/profiles").set(auth(viewer.token)).expect(200);
    const seen = discovery.body.find((p: any) => p.userId === user.userId);
    expect(seen).toBeDefined();
    expect(seen.isVerified).toBe(false);
  });

  it("pending users can match, and matching never marks anyone verified", async () => {
    const pending = await signup();
    await request(app).post("/api/verification/submit").set(auth(pending.token)).send(submitBody).expect(200);

    const target = await signup();
    await approveUser(target.userId);

    await request(app)
      .post("/api/swipe")
      .set(auth(pending.token))
      .send({ toUserId: target.userId, action: "like" })
      .expect(200);

    const me = await request(app).get("/api/auth/me").set(auth(pending.token)).expect(200);
    expect(me.body.profile.verificationStatus).toBe("pending");
    expect(me.body.profile.isVerified).toBe(false);
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

describe("LinkedIn verification for working / intern / freelance accounts", () => {
  const signupNonStudent = (occupation: string) =>
    signup({ university: "", occupation });

  it("stores the registration category and keeps students on the university path", async () => {
    const freelancer = await signupNonStudent("freelance");
    const me = await request(app).get("/api/auth/me").set(auth(freelancer.token)).expect(200);
    expect(me.body.profile.occupation).toBe("freelance");
    expect(me.body.profile.university).toBe("");

    // Default helpers sign up with a university and no occupation — the
    // category derives to student, exactly like pre-expansion accounts.
    const student = await signup();
    const meStudent = await request(app).get("/api/auth/me").set(auth(student.token)).expect(200);
    expect(meStudent.body.profile.occupation).toBe("student");
  });

  it("students must sign up with a university", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({
        email: `no-uni-${Date.now()}@nest.test`,
        password: "sup3r-secret-pw",
        name: "No Uni",
        age: 22,
        nationality: "Spain 🇪🇸",
        university: "",
        occupation: "student",
        termsAccepted: true,
        languages: ["English (Native)"],
        bio: "x",
        photo: "https://example.com/p.jpg",
        interests: { activities: [], music: [], social: [], lifestyle: [], spendingStyle: "middle range baddie" }
      });
    expect(res.status).toBe(400);
  });

  it("the verification method follows the stored category, not the request body", async () => {
    const worker = await signupNonStudent("working");

    // University details on a working account are refused — the server picks
    // the LinkedIn branch from her category and finds no name.
    const wrongMethod = await request(app)
      .post("/api/verification/submit")
      .set(auth(worker.token))
      .send(submitBody);
    expect(wrongMethod.status).toBe(400);

    // A student sending only a LinkedIn name is equally refused.
    const student = await signup();
    const wrongMethod2 = await request(app)
      .post("/api/verification/submit")
      .set(auth(student.token))
      .send({ linkedinName: "Maria Garcia" });
    expect(wrongMethod2.status).toBe(400);
  });

  it("a LinkedIn submission goes to pending, never auto-approves, and reaches the existing admin queue", async () => {
    const intern = await signupNonStudent("intern");

    const submitted = await request(app)
      .post("/api/verification/submit")
      .set(auth(intern.token))
      .send({ linkedinName: "  Ana Martínez  " })
      .expect(200);
    expect(submitted.body.profile.verificationStatus).toBe("pending");
    expect(submitted.body.profile.isVerified).toBe(false);
    expect(submitted.body.profile.verification.linkedinName).toBe("Ana Martínez");

    // No duplicate submissions while the review is open.
    const again = await request(app)
      .post("/api/verification/submit")
      .set(auth(intern.token))
      .send({ linkedinName: "Ana Martínez" });
    expect(again.status).toBe(400);

    // The SAME admin queue shows it, with the category and the name to check.
    const admin = await getAdmin();
    const queue = await request(app).get("/api/admin/verifications").set(auth(admin.token)).expect(200);
    const row = queue.body.find((v: any) => v.userId === intern.userId);
    expect(row.occupation).toBe("intern");
    expect(row.verification.linkedinName).toBe("Ana Martínez");

    // Manual approval through the existing endpoint grants the same status.
    await request(app).post(`/api/admin/verifications/${intern.userId}/approve`).set(auth(admin.token)).expect(200);
    const me = await request(app).get("/api/auth/me").set(auth(intern.token)).expect(200);
    expect(me.body.profile.verificationStatus).toBe("approved");
    expect(me.body.profile.isVerified).toBe(true);

    // And an approved account cannot resubmit.
    const after = await request(app)
      .post("/api/verification/submit")
      .set(auth(intern.token))
      .send({ linkedinName: "Ana Martínez" });
    expect(after.status).toBe(400);
  });

  it("a rejected member can submit her LinkedIn name again", async () => {
    const admin = await getAdmin();
    const freelancer = await signupNonStudent("freelance");

    await request(app)
      .post("/api/verification/submit")
      .set(auth(freelancer.token))
      .send({ linkedinName: "Wrong Name" })
      .expect(200);
    await request(app)
      .post(`/api/admin/verifications/${freelancer.userId}/reject`)
      .set(auth(admin.token))
      .send({ reason: "Could not find this profile" })
      .expect(200);

    const resub = await request(app)
      .post("/api/verification/submit")
      .set(auth(freelancer.token))
      .send({ linkedinName: "Right Name" })
      .expect(200);
    expect(resub.body.profile.verificationStatus).toBe("pending");
    expect(resub.body.profile.verification.linkedinName).toBe("Right Name");
  });

  it("LinkedIn names stay private: other members never see the verification record", async () => {
    const viewer = await signup();
    await approveUser(viewer.userId);
    const worker = await signupNonStudent("working");
    await request(app)
      .post("/api/verification/submit")
      .set(auth(worker.token))
      .send({ linkedinName: "Secret LinkedIn Name" })
      .expect(200);

    const discovery = await request(app).get("/api/profiles").set(auth(viewer.token)).expect(200);
    expect(JSON.stringify(discovery.body)).not.toContain("Secret LinkedIn Name");
  });
});
