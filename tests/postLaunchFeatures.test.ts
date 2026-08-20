import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, signup, auth, getAdmin, createMatchedPair } from "./helpers";
import { TERMS_VERSION } from "../shared/terms";

const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const nextWeekIso = `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, "0")}-${String(nextWeek.getDate()).padStart(2, "0")}`;

const planBody = {
  activity: "coffee",
  title: "Coffee at Federal Café",
  placeName: "Federal Café",
  date: nextWeekIso,
  time: "17:00"
};

describe("terms & conditions enforcement", () => {
  it("refuses sign-up without active acceptance", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      email: `terms-${Date.now()}@nest.test`,
      password: "sup3r-secret-pw",
      name: "Terms Test",
      university: "IE University"
      // termsAccepted deliberately absent
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Terms/);
  });

  it("refuses a non-boolean acceptance value", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      email: `terms2-${Date.now()}@nest.test`,
      password: "sup3r-secret-pw",
      name: "Terms Test",
      university: "IE University",
      termsAccepted: "yes"
    });
    expect(res.status).toBe(400);
  });

  it("stamps the current terms version onto accepted accounts", async () => {
    const user = await signup();
    const me = await request(app).get("/api/auth/me").set(auth(user.token)).expect(200);
    expect(me.body.user.termsVersion).toBe(TERMS_VERSION);
  });
});

describe("admin university correction", () => {
  it("is admin-only", async () => {
    const a = await signup();
    const b = await signup();
    const res = await request(app)
      .post(`/api/admin/users/${b.userId}/university`)
      .set(auth(a.token))
      .send({ university: "IE University" });
    expect(res.status).toBe(403);
  });

  it("normalizes to the canonical name and only accepts listed universities", async () => {
    const admin = await getAdmin();
    const member = await signup();

    const bad = await request(app)
      .post(`/api/admin/users/${member.userId}/university`)
      .set(auth(admin.token))
      .send({ university: "Hogwarts" });
    expect(bad.status).toBe(400);

    const ok = await request(app)
      .post(`/api/admin/users/${member.userId}/university`)
      .set(auth(admin.token))
      .send({ university: "ucm" });
    expect(ok.status).toBe(200);
    expect(ok.body.university).toBe("Universidad Complutense de Madrid");

    const me = await request(app).get("/api/auth/me").set(auth(member.token)).expect(200);
    expect(me.body.profile.university).toBe("Universidad Complutense de Madrid");
  });

  it("exposes a member's full profile to admins only", async () => {
    const admin = await getAdmin();
    const member = await signup();

    const forbidden = await request(app)
      .get(`/api/admin/users/${member.userId}/profile`)
      .set(auth(member.token));
    expect(forbidden.status).toBe(403);

    const res = await request(app)
      .get(`/api/admin/users/${member.userId}/profile`)
      .set(auth(admin.token))
      .expect(200);
    expect(res.body.name).toBeTruthy();
    expect(res.body.interests).toBeTruthy();
  });
});

describe("cancelling an outing", () => {
  it("lets the creator cancel an accepted outing", async () => {
    const { a, b, matchId } = await createMatchedPair();
    const created = await request(app)
      .post(`/api/chats/${matchId}/plans`)
      .set(auth(a.token))
      .send(planBody)
      .expect(200);

    await request(app)
      .post(`/api/plans/${created.body.id}/respond`)
      .set(auth(b.token))
      .send({ status: "accepted" })
      .expect(200);

    const cancelled = await request(app)
      .post(`/api/plans/${created.body.id}/respond`)
      .set(auth(a.token))
      .send({ status: "cancelled" })
      .expect(200);
    expect(cancelled.body.status).toBe("cancelled");
  });

  it("never lets the other participant cancel it", async () => {
    const { a, b, matchId } = await createMatchedPair();
    const created = await request(app)
      .post(`/api/chats/${matchId}/plans`)
      .set(auth(a.token))
      .send(planBody)
      .expect(200);

    const res = await request(app)
      .post(`/api/plans/${created.body.id}/respond`)
      .set(auth(b.token))
      .send({ status: "cancelled" });
    expect(res.status).toBe(403);
  });

  it("refuses to cancel a declined outing", async () => {
    const { a, b, matchId } = await createMatchedPair();
    const created = await request(app)
      .post(`/api/chats/${matchId}/plans`)
      .set(auth(a.token))
      .send(planBody)
      .expect(200);

    await request(app)
      .post(`/api/plans/${created.body.id}/respond`)
      .set(auth(b.token))
      .send({ status: "declined" })
      .expect(200);

    const res = await request(app)
      .post(`/api/plans/${created.body.id}/respond`)
      .set(auth(a.token))
      .send({ status: "cancelled" });
    expect(res.status).toBe(400);
  });
});

describe("undoing the most recent swipe", () => {
  it("deletes the swipe so the member returns to the deck", async () => {
    const viewer = await signup();
    const target = await signup();

    await request(app)
      .post("/api/swipe")
      .set(auth(viewer.token))
      .send({ toUserId: target.userId, action: "pass" })
      .expect(200);

    // Passed → she is out of the deck.
    const before = await request(app).get("/api/profiles").set(auth(viewer.token)).expect(200);
    expect(before.body.some((p: any) => p.userId === target.userId)).toBe(false);

    await request(app)
      .post("/api/swipe/undo")
      .set(auth(viewer.token))
      .send({ toUserId: target.userId })
      .expect(200);

    // Undone → she is genuinely back.
    const after = await request(app).get("/api/profiles").set(auth(viewer.token)).expect(200);
    expect(after.body.some((p: any) => p.userId === target.userId)).toBe(true);
  });

  it("only undoes the most recent swipe", async () => {
    const viewer = await signup();
    const first = await signup();
    const second = await signup();

    await request(app).post("/api/swipe").set(auth(viewer.token)).send({ toUserId: first.userId, action: "pass" }).expect(200);
    await request(app).post("/api/swipe").set(auth(viewer.token)).send({ toUserId: second.userId, action: "pass" }).expect(200);

    const res = await request(app)
      .post("/api/swipe/undo")
      .set(auth(viewer.token))
      .send({ toUserId: first.userId });
    expect(res.status).toBe(409);
  });

  it("refuses to undo a swipe that became a match", async () => {
    const { a, b } = await createMatchedPair();
    const res = await request(app)
      .post("/api/swipe/undo")
      .set(auth(b.token))
      .send({ toUserId: a.userId });
    expect(res.status).toBe(409);
  });

  it("404s when there is nothing to undo", async () => {
    const lonely = await signup();
    const res = await request(app)
      .post("/api/swipe/undo")
      .set(auth(lonely.token))
      .send({ toUserId: "nobody" });
    expect(res.status).toBe(404);
  });
});
