import request from "supertest";
import app from "../server";

export { app };

let counter = 0;

export interface TestUser {
  token: string;
  userId: string;
  email: string;
  profileId: string;
}

export async function signup(overrides: Record<string, unknown> = {}): Promise<TestUser> {
  counter += 1;
  const email = (overrides.email as string) || `user${counter}-${Date.now()}@nest.test`;
  const res = await request(app)
    .post("/api/auth/signup")
    .send({
      email,
      password: "sup3r-secret-pw",
      name: `Test User ${counter}`,
      age: 22,
      nationality: "Spain 🇪🇸",
      university: "Test University",
      languages: ["English (Native)"],
      bio: "Test bio",
      photo: "https://example.com/photo.jpg",
      interests: {
        activities: ["yoga"],
        music: ["pop"],
        social: ["cafes"],
        lifestyle: ["wellness"],
        spendingStyle: "middle range baddie"
      },
      ...overrides
    });
  if (res.status !== 200) {
    throw new Error(`signup failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return {
    token: res.body.token,
    userId: res.body.user.id,
    email: res.body.user.email,
    profileId: res.body.profile.id
  };
}

// The email below matches ADMIN_EMAILS in tests/setup.ts, so this account
// is bootstrapped with the admin role. One admin per test file.
export async function signupAdmin(): Promise<TestUser> {
  return signup({ email: "admin@nest.test" });
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// Creates two users who have liked each other, producing a match.
export async function createMatchedPair(): Promise<{ a: TestUser; b: TestUser; matchId: string }> {
  const a = await signup();
  const b = await signup();

  await request(app).post("/api/swipe").set(auth(a.token)).send({ toUserId: b.userId, action: "like" });
  const res = await request(app).post("/api/swipe").set(auth(b.token)).send({ toUserId: a.userId, action: "like" });

  if (!res.body.isMatch) {
    throw new Error(`expected a match, got: ${JSON.stringify(res.body)}`);
  }
  return { a, b, matchId: res.body.matchId };
}
