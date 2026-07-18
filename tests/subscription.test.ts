import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, auth, signup } from "./helpers";
import { PREMIUM_PLAN, PREMIUM_PRICE_LABEL, formatPrice } from "../shared/subscription";

describe("premium plan configuration", () => {
  it("is €20 per month, stored in integer euro cents", () => {
    expect(PREMIUM_PLAN.priceCents).toBe(2000);
    expect(PREMIUM_PLAN.currency).toBe("EUR");
    expect(PREMIUM_PLAN.interval).toBe("month");
    expect(PREMIUM_PRICE_LABEL).toBe("€20/month");
    expect(formatPrice(2000)).toBe("€20");
    expect(formatPrice(1050)).toBe("€10.50");
  });
});

describe("subscription endpoints (Stripe not configured)", () => {
  it("reports plan details and unconfigured payments in the status endpoint", async () => {
    const user = await signup();
    const res = await request(app).get("/api/subscription/status").set(auth(user.token)).expect(200);

    expect(res.body.stripeConfigured).toBe(false);
    expect(res.body.premium).toBe(false);
    expect(res.body.plan.priceCents).toBe(2000);
    expect(res.body.plan.label).toBe("€20/month");
  });

  it("checkout fails safely with 503 and never fakes success", async () => {
    const user = await signup();
    const res = await request(app).post("/api/subscription/checkout").set(auth(user.token));
    expect(res.status).toBe(503);
    expect(res.body.error).toContain("not configured");
    expect(res.body.url).toBeUndefined();
  });

  it("the customer portal is unavailable without Stripe", async () => {
    const user = await signup();
    const res = await request(app).post("/api/subscription/portal").set(auth(user.token));
    expect(res.status).toBe(503);
  });

  it("the webhook rejects requests when unconfigured", async () => {
    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("Content-Type", "application/json")
      .send('{"type":"checkout.session.completed"}');
    expect(res.status).toBe(503);
  });

  it("clients cannot self-assign Premium", async () => {
    const user = await signup();

    // The old fake endpoint is gone
    await request(app)
      .post("/api/subscription/subscribe")
      .set(auth(user.token))
      .send({ cardHolder: "X" })
      .expect(404);

    // And profile updates cannot flip premium flags
    await request(app)
      .post("/api/profiles/update")
      .set(auth(user.token))
      .send({ isPremium: true })
      .expect(200);
    const me = await request(app).get("/api/auth/me").set(auth(user.token)).expect(200);
    expect(me.body.user.isPremium).toBe(false);
  });
});

describe("webhook signature verification (Stripe configured with test secrets)", () => {
  it("rejects an invalid signature with 400", async () => {
    // Configure fake credentials, then load a fresh app instance so the
    // webhook path takes the configured branch.
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy_key_for_signature_test";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy_secret";
    try {
      const { default: freshApp } = await import("../server");
      const res = await request(freshApp)
        .post("/api/stripe/webhook")
        .set("Content-Type", "application/json")
        .set("stripe-signature", "t=1,v1=totally-invalid")
        .send('{"id":"evt_test","type":"checkout.session.completed"}');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid signature");
    } finally {
      delete process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_WEBHOOK_SECRET;
    }
  });
});
