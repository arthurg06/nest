import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, signup, auth } from "./helpers";
import { MADRID_UNIVERSITIES, canonicalUniversity, universityKey } from "../shared/universities";

const signupBody = (overrides: Record<string, unknown> = {}) => ({
  email: `uni-${Math.random().toString(36).slice(2, 10)}@nest.test`,
  password: "sup3r-secret-pw",
  name: "Uni Tester",
  age: 22,
  nationality: "Spain 🇪🇸",
  university: "IE University",
  ...overrides,
});

describe("Madrid university list", () => {
  it("resolves every canonical name to itself", () => {
    for (const uni of MADRID_UNIVERSITIES) {
      expect(canonicalUniversity(uni.name)).toBe(uni.name);
    }
  });

  it("resolves abbreviations and accent/case variants to the canonical name", () => {
    expect(canonicalUniversity("UCM")).toBe("Universidad Complutense de Madrid");
    expect(canonicalUniversity("universidad politecnica de madrid")).toBe("Universidad Politécnica de Madrid");
    expect(canonicalUniversity("  ie university  ")).toBe("IE University");
    expect(canonicalUniversity("CUNEF")).toBe("CUNEF Universidad");
  });

  it("rejects universities outside Madrid", () => {
    expect(canonicalUniversity("Universidad de Navarra")).toBeNull();
    expect(canonicalUniversity("Universidad Europea de Canarias")).toBeNull();
    expect(canonicalUniversity("Hogwarts")).toBeNull();
    expect(canonicalUniversity("")).toBeNull();
  });

  it("compares legacy values accent- and whitespace-insensitively", () => {
    expect(universityKey("Saint Louis  University ")).toBe(universityKey("saint louis university"));
  });
});

describe("sign-up university validation", () => {
  it("rejects a university that is not on the approved list", async () => {
    const res = await request(app).post("/api/auth/signup").send(signupBody({ university: "Hogwarts" }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Madrid/);
  });

  it("rejects a missing university", async () => {
    const res = await request(app).post("/api/auth/signup").send(signupBody({ university: undefined }));
    expect(res.status).toBe(400);
  });

  it("stores the canonical name whatever variant was submitted", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send(signupBody({ university: "universidad politecnica de madrid" }));
    expect(res.status).toBe(200);
    expect(res.body.profile.university).toBe("Universidad Politécnica de Madrid");
  });
});

describe("profile-update university validation", () => {
  it("rejects changing the university to a non-approved value", async () => {
    const user = await signup();
    const res = await request(app)
      .post("/api/profiles/update")
      .set(auth(user.token))
      .send({ university: "Hogwarts" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Madrid/);
  });

  it("accepts changing the university to an approved one and stores the canonical name", async () => {
    const user = await signup();
    const res = await request(app)
      .post("/api/profiles/update")
      .set(auth(user.token))
      .send({ university: "ucm" });
    expect(res.status).toBe(200);
    expect(res.body.university).toBe("Universidad Complutense de Madrid");
  });

  it("keeps the stored university when the update omits it", async () => {
    const user = await signup({ university: "Universidad Nebrija" });
    const res = await request(app)
      .post("/api/profiles/update")
      .set(auth(user.token))
      .send({ bio: "New bio, same university" });
    expect(res.status).toBe(200);
    expect(res.body.university).toBe("Universidad Nebrija");
  });
});
