import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, signup, auth, approveUser, createMatchedPair } from "./helpers";
import { profileFor, MATCH_ONLY_FIELDS, PRIVATE_FIELDS } from "../shared/visibility";

const handles = {
  instagram: "her_handle",
  tiktok: "her_tiktok",
  otherSocial: "Snapchat: her_snap"
};

describe("what other members can see of a profile", () => {
  it("keeps social handles out of the open deck", async () => {
    const her = await signup(handles);
    await approveUser(her.userId);

    const browsing = await signup();
    const deck = await request(app).get("/api/profiles").set(auth(browsing.token)).expect(200);

    const card = deck.body.find((p: any) => p.id === her.profileId);
    expect(card).toBeDefined();
    for (const field of MATCH_ONLY_FIELDS) {
      expect(card).not.toHaveProperty(field);
    }
  });

  it("shares them once the two have matched", async () => {
    const { a, b } = await createMatchedPair();
    await request(app).post("/api/profiles/update").set(auth(b.token)).send(handles).expect(200);

    const matches = await request(app).get("/api/matches").set(auth(a.token)).expect(200);
    const hers = matches.body.find((m: any) => m.profile?.id === b.profileId)?.profile;

    expect(hers).toBeDefined();
    expect(hers.instagram).toBe(handles.instagram);
    expect(hers.tiktok).toBe(handles.tiktok);
    expect(hers.otherSocial).toBe(handles.otherSocial);
  });

  it("never sends the verification record to anyone else, matched or not", async () => {
    // A member still under review: her record holds the university email she
    // submitted, which is the part nobody else may ever read.
    const underReview = await signup();
    await request(app)
      .post("/api/verification/submit")
      .set(auth(underReview.token))
      .send({ university: "Test University", universityEmail: "her@uni.test" })
      .expect(200);

    const { a, b } = await createMatchedPair();

    const deck = await request(app).get("/api/profiles").set(auth(a.token)).expect(200);
    expect(deck.body.some((p: any) => p.id === underReview.profileId)).toBe(true);
    for (const card of deck.body) {
      for (const field of PRIVATE_FIELDS) {
        expect(card).not.toHaveProperty(field);
      }
    }

    // …and an approved member's record stays private from her own match too.
    const matches = await request(app).get("/api/matches").set(auth(a.token)).expect(200);
    const hers = matches.body.find((m: any) => m.profile?.id === b.profileId)?.profile;
    expect(hers).toBeDefined();
    expect(hers).not.toHaveProperty("verification");
  });

  it("still gives a member her own handles and verification back", async () => {
    const her = await signup(handles);
    const me = await request(app).get("/api/auth/me").set(auth(her.token)).expect(200);

    expect(me.body.profile.instagram).toBe(handles.instagram);
    expect(me.body.profile.tiktok).toBe(handles.tiktok);
  });

  // The profile preview screen hides fields by calling profileFor(). If the
  // API ever returned a field profileFor keeps — or kept one the API drops —
  // the preview would be telling her something untrue about her own privacy.
  it("hides in the preview exactly what the API withholds", async () => {
    const her = await signup(handles);
    await approveUser(her.userId);

    const browsing = await signup();
    const [deck, mine] = await Promise.all([
      request(app).get("/api/profiles").set(auth(browsing.token)).expect(200),
      request(app).get("/api/auth/me").set(auth(her.token)).expect(200)
    ]);

    const asOthersSeeIt = deck.body.find((p: any) => p.id === her.profileId);
    const asThePreviewBuildsIt = profileFor(mine.body.profile, "everyone");

    expect(Object.keys(asOthersSeeIt).sort()).toEqual(Object.keys(asThePreviewBuildsIt).sort());
  });
});
