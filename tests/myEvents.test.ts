import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, signup, auth, getAdmin, createMatchedPair } from "./helpers";
import { displayUniversity } from "../shared/universities";

const future = (days: number) => {
  const d = new Date(Date.now() + days * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const plan = (date: string, title: string) => ({
  activity: "coffee",
  title,
  placeName: "Federal Café",
  date,
  time: "17:00"
});

describe("my events", () => {
  it("shows only the caller's accepted upcoming outings, soonest first", async () => {
    const { a, b, matchId } = await createMatchedPair();

    // Accepted, 10 days out.
    const far = await request(app).post(`/api/chats/${matchId}/plans`).set(auth(a.token)).send(plan(future(10), "Coffee later")).expect(200);
    await request(app).post(`/api/plans/${far.body.id}/respond`).set(auth(b.token)).send({ status: "accepted" }).expect(200);

    // Accepted, 3 days out — must sort first.
    const soon = await request(app).post(`/api/chats/${matchId}/plans`).set(auth(a.token)).send(plan(future(3), "Coffee soon")).expect(200);
    await request(app).post(`/api/plans/${soon.body.id}/respond`).set(auth(b.token)).send({ status: "accepted" }).expect(200);

    // Declined — must not appear.
    const declined = await request(app).post(`/api/chats/${matchId}/plans`).set(auth(a.token)).send(plan(future(5), "Declined one")).expect(200);
    await request(app).post(`/api/plans/${declined.body.id}/respond`).set(auth(b.token)).send({ status: "declined" }).expect(200);

    // Pending (unconfirmed) — must not appear.
    await request(app).post(`/api/chats/${matchId}/plans`).set(auth(a.token)).send(plan(future(7), "Pending one")).expect(200);

    const res = await request(app).get("/api/my-events").set(auth(a.token)).expect(200);
    const titles = res.body.items.map((i: any) => i.title);
    expect(titles).toEqual(["Coffee soon", "Coffee later"]);
    expect(res.body.items[0].withName).toBeTruthy();
  });

  it("hides cancelled outings", async () => {
    const { a, b, matchId } = await createMatchedPair();
    const p = await request(app).post(`/api/chats/${matchId}/plans`).set(auth(a.token)).send(plan(future(4), "Cancelled later")).expect(200);
    await request(app).post(`/api/plans/${p.body.id}/respond`).set(auth(b.token)).send({ status: "accepted" }).expect(200);
    await request(app).post(`/api/plans/${p.body.id}/respond`).set(auth(a.token)).send({ status: "cancelled" }).expect(200);

    const res = await request(app).get("/api/my-events").set(auth(a.token)).expect(200);
    expect(res.body.items.map((i: any) => i.title)).not.toContain("Cancelled later");
  });

  it("never exposes another member's outings, whatever the client asks", async () => {
    const { a, b, matchId } = await createMatchedPair();
    const p = await request(app).post(`/api/chats/${matchId}/plans`).set(auth(a.token)).send(plan(future(6), "Private outing")).expect(200);
    await request(app).post(`/api/plans/${p.body.id}/respond`).set(auth(b.token)).send({ status: "accepted" }).expect(200);

    // A third member sees nothing of it — no parameters exist to widen scope.
    const outsider = await signup();
    const res = await request(app)
      .get("/api/my-events?userId=" + a.userId)
      .set(auth(outsider.token))
      .expect(200);
    expect(res.body.items).toHaveLength(0);
  });

  it("includes RSVPed NEST outings and excludes clearly past ones", async () => {
    const admin = await getAdmin();
    const soon = new Date(Date.now() + 5 * 86400000);
    const monthDay = soon.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const mk = (title: string, date: string) =>
      request(app).post("/api/events").set(auth(admin.token)).send({
        title, description: "d", date, time: "18:00", location: "Retiro", category: "social", price: "Free"
      });
    const upcoming = await mk("Upcoming picnic", `Saturday, ${monthDay}`).expect(200);
    const past = await mk("Past picnic", "Monday, Jan 2").expect(200);

    const member = await signup();
    await request(app).post(`/api/admin/users/${member.userId}/premium`).set(auth(admin.token)).send({ isPremium: true }).expect(200);
    await request(app).post(`/api/events/${upcoming.body.id}/rsvp`).set(auth(member.token)).expect(200);
    await request(app).post(`/api/events/${past.body.id}/rsvp`).set(auth(member.token)).expect(200);

    const res = await request(app).get("/api/my-events").set(auth(member.token)).expect(200);
    const titles = res.body.items.map((i: any) => i.title);
    expect(titles).toContain("Upcoming picnic");
    expect(titles).not.toContain("Past picnic");
  });
});

describe("university display names", () => {
  it("abbreviates the well-known universities and keeps the rest", () => {
    expect(displayUniversity("Universidad Complutense de Madrid")).toBe("UCM");
    expect(displayUniversity("Universidad Europea de Madrid")).toBe("UEM");
    expect(displayUniversity("Universidad Pontificia Comillas")).toBe("Comillas");
    expect(displayUniversity("Universidad Carlos III de Madrid")).toBe("UC3M");
    // The common name IS the display name.
    expect(displayUniversity("IE University")).toBe("IE University");
    // Legacy free text passes through untouched.
    expect(displayUniversity("Saint Louis University")).toBe("Saint Louis University");
    expect(displayUniversity("")).toBe("");
  });
});
