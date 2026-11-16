import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, signup, auth, getAdmin } from "./helpers";

// Member lists open on the newest accounts: the discovery deck and the admin
// members list are ordered by account creation time, descending.

// Timestamps have millisecond resolution; a short pause between sign-ups
// guarantees three distinct creation times.
const pause = () => new Promise(resolve => setTimeout(resolve, 5));

async function threeMembersInOrder() {
  const first = await signup();
  await pause();
  const second = await signup();
  await pause();
  const third = await signup();
  return [first, second, third];
}

describe("profile ordering: newest account first", () => {
  it("orders the discovery deck newest member first", async () => {
    const [first, second, third] = await threeMembersInOrder();
    const viewer = await signup();

    const deck = await request(app).get("/api/profiles").set(auth(viewer.token)).expect(200);
    const ours = [first, second, third].map(u => u.userId);
    const seen = deck.body.map((p: any) => p.userId).filter((id: string) => ours.includes(id));

    expect(seen).toEqual([third.userId, second.userId, first.userId]);
  });

  it("orders the admin members list newest account first", async () => {
    const admin = await getAdmin();
    const [first, second, third] = await threeMembersInOrder();

    const list = await request(app).get("/api/admin/users").set(auth(admin.token)).expect(200);
    const ours = [first, second, third].map(u => u.userId);
    const seen = list.body.map((u: any) => u.id).filter((id: string) => ours.includes(id));

    expect(seen).toEqual([third.userId, second.userId, first.userId]);
  });
});
