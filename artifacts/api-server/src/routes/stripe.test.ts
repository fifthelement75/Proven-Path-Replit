import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import Stripe from "stripe";
import { db, companiesTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { signToken } from "../middlewares/auth";
import { BILLING_PLANS, type BillingPlan } from "./stripeHelpers";
import app from "../app";

// Keep the production app's raw-body webhook registration and JSON middleware,
// but avoid loading unrelated routers (and their external service clients).
vi.mock("./index", async () => ({ default: (await import("./stripe")).default }));

const mocks = vi.hoisted(() => ({
  client: vi.fn(),
  processWebhook: vi.fn(),
  createCustomer: vi.fn(),
  createCheckout: vi.fn(),
  searchProducts: vi.fn(),
  listPrices: vi.fn(),
  retrieveProduct: vi.fn(),
  retrieveSubscription: vi.fn(),
  retrieveCustomer: vi.fn(),
}));
vi.mock("../lib/stripeClient", () => ({
  getUncachableStripeClient: mocks.client,
  getStripeSync: async () => ({ processWebhook: mocks.processWebhook }),
}));

// Synthetic test-only credentials; no live Stripe calls are made.
const signingSecret = "whsec_billing_regression_fixture";
const stripe = new Stripe("sk_test_billing_regression_fixture");
const ids: number[] = [];
let adminToken: string;
let employeeToken: string;
let managerToken: string;

function product(plan: BillingPlan) {
  return { id: `prod_${plan}`, active: true, name: BILLING_PLANS[plan].productName };
}

function price(plan: BillingPlan) {
  return {
    id: `price_${plan}`, active: true, currency: "usd",
    unit_amount: BILLING_PLANS[plan].unitAmount,
    recurring: { interval: "month" }, product: product(plan),
  };
}

function subscription(plan: BillingPlan = "team", quantity = 12, status = "active") {
  return {
    id: "sub_billing_fixture", customer: "cus_billing_fixture", status,
    // Deliberately contradict the purchased plan/quantity: metadata is not an entitlement.
    metadata: { companyId: String(ids[0]), plan: plan === "team" ? "professional" : "team", quantity: "999" },
    items: { data: [{ quantity, price: price(plan) }] },
  };
}

function checkout(body: unknown, token = adminToken) {
  return request(app).post("/api/stripe/checkout").set("Host", "localhost")
    .auth(token, { type: "bearer" }).send(body as object);
}

async function company(id = ids[0]) {
  const [row] = await db.select().from(companiesTable).where(eq(companiesTable.id, id));
  return row;
}

async function webhook(type: string, object: object) {
  const payload = JSON.stringify({
    id: "evt_billing_fixture", object: "event", type, data: { object },
  });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: signingSecret });
  const response = await request(app).post("/api/stripe/webhook")
    .set("Content-Type", "application/json").set("Stripe-Signature", signature).send(payload);
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ received: true });
  // Proves Express passed the untouched bytes and header through to verification.
  expect(mocks.processWebhook).toHaveBeenCalledWith(Buffer.from(payload), signature);
}

async function expectEntitlement(plan: string, quantity: number | null, status = "active") {
  expect(await company()).toMatchObject({
    plan, stripeSeatQuantity: quantity, subscriptionStatus: status,
  });
  const response = await request(app).get("/api/stripe/subscription")
    .auth(adminToken, { type: "bearer" });
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({
    plan, seatQuantity: quantity,
    hasActiveAccess: plan !== "free",
    subscriptionActive: plan !== "free",
    teamAccess: plan === "team",
  });
}

beforeAll(async () => {
  for (let i = 0; i < 2; i++) {
    const [row] = await db.insert(companiesTable).values({
      name: "Billing route regression fixture",
      email: `__test_billing_${crypto.randomUUID()}@example.test`,
      passwordHash: "not-a-login-fixture", plan: "free", trialEndsAt: null,
      complimentaryTeamAccess: false,
    }).returning();
    ids.push(row.id);
  }
  const payload = {
    companyId: ids[0], userId: ids[0], email: "billing@example.test", employeeId: null,
  };
  adminToken = signToken({ ...payload, role: "admin" });
  employeeToken = signToken({ ...payload, role: "employee" });
  managerToken = signToken({ ...payload, role: "manager" });
});

beforeEach(async () => {
  vi.resetAllMocks();
  mocks.client.mockResolvedValue({
    customers: { create: mocks.createCustomer, retrieve: mocks.retrieveCustomer },
    checkout: { sessions: { create: mocks.createCheckout } },
    products: { search: mocks.searchProducts, retrieve: mocks.retrieveProduct },
    prices: { list: mocks.listPrices },
    subscriptions: { retrieve: mocks.retrieveSubscription },
  });
  mocks.createCustomer.mockResolvedValue({ id: "cus_created_fixture" });
  mocks.createCheckout.mockResolvedValue({ url: "https://checkout.stripe.com/test_fixture" });
  mocks.searchProducts.mockResolvedValue({ data: [product("professional"), product("team")] });
  mocks.listPrices.mockResolvedValue({ data: [price("professional"), price("team")] });
  mocks.retrieveProduct.mockResolvedValue(product("team"));
  mocks.retrieveCustomer.mockResolvedValue({ metadata: { companyId: String(ids[0]) } });
  mocks.retrieveSubscription.mockResolvedValue(subscription());
  // Mock the sync service boundary, not the webhook orchestrator or entitlement helpers.
  mocks.processWebhook.mockImplementation((body: Buffer, signature: string) => {
    // Match stripe-replit-sync: it verifies/handles the event and returns void.
    stripe.webhooks.constructEvent(body, signature, signingSecret);
  });
  await db.update(companiesTable).set({
    stripeCustomerId: "cus_billing_fixture", stripeSubscriptionId: "sub_previous",
    subscriptionStatus: "active", plan: "team", stripeSeatQuantity: 25,
    trialEndsAt: null, complimentaryTeamAccess: false,
  }).where(eq(companiesTable.id, ids[0]));
});

afterAll(async () => {
  if (ids.length) await db.delete(companiesTable).where(inArray(companiesTable.id, ids));
});

describe("POST /api/stripe/checkout", () => {
  it.each([
    ["professional", 1], ["team", 10], ["team", 17],
  ] as const)("creates %s checkout for %i paid seats with server-owned metadata", async (plan, quantity) => {
    const response = await checkout({ plan, quantity, companyId: ids[1], priceId: "price_untrusted" });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ url: "https://checkout.stripe.com/test_fixture" });
    const metadata = { companyId: String(ids[0]), plan, quantity: String(quantity) };
    expect(mocks.createCheckout).toHaveBeenCalledExactlyOnceWith({
      mode: "subscription", customer: "cus_billing_fixture",
      line_items: [{ price: `price_${plan}`, quantity }],
      success_url: expect.stringMatching(/\/billing\?checkout=success$/),
      cancel_url: expect.stringMatching(/\/billing\?checkout=cancel$/),
      metadata, subscription_data: { metadata }, allow_promotion_codes: true,
    });
    // Creating a checkout must not grant seats before Stripe confirms payment.
    expect(await company()).toMatchObject({ plan: "team", stripeSeatQuantity: 25 });
    expect(mocks.createCustomer).not.toHaveBeenCalled();
  });

  it("creates and persists a customer when the company has none", async () => {
    await db.update(companiesTable).set({ stripeCustomerId: null }).where(eq(companiesTable.id, ids[0]));
    const response = await checkout({ plan: "professional", quantity: 1 });
    expect(response.status).toBe(200);
    const row = await company();
    expect(mocks.createCustomer).toHaveBeenCalledExactlyOnceWith({
      email: row.email, name: row.name, metadata: { companyId: String(ids[0]) },
    });
    expect(row.stripeCustomerId).toBe("cus_created_fixture");
    expect(mocks.createCheckout).toHaveBeenCalledWith(expect.objectContaining({ customer: "cus_created_fixture" }));
  });

  it.each([
    { plan: "team", quantity: 9 }, { plan: "professional", quantity: 2 },
    { plan: "pro", quantity: 1 }, { plan: "enterprise", quantity: 10 },
    { plan: "team", quantity: 10.5 }, { plan: "team", quantity: "10" },
    { plan: "team", quantity: 0 }, { plan: "team" }, {},
  ])("rejects invalid selection %j before calling Stripe", async body => {
    expect((await checkout(body)).status).toBe(400);
    expect(mocks.client).not.toHaveBeenCalled();
    expect(await company()).toMatchObject({ plan: "team", stripeSeatQuantity: 25 });
  });

  it("requires authentication and a company admin", async () => {
    const body = { plan: "team", quantity: 10 };
    expect((await request(app).post("/api/stripe/checkout").send(body)).status).toBe(401);
    expect((await checkout(body, "invalid-token")).status).toBe(401);
    expect((await checkout(body, employeeToken)).status).toBe(403);
    expect((await checkout(body, managerToken)).status).toBe(403);
    expect(mocks.client).not.toHaveBeenCalled();
  });
});

describe("POST /api/stripe/webhook signed orchestration", () => {
  it.each(["customer.subscription.created", "customer.subscription.updated", "checkout.session.completed"])(
    "%s activates the actual Professional or Team purchase, not metadata",
    async type => {
      for (const [plan, quantity] of [["professional", 1], ["team", 10], ["team", 18]] as const) {
        const sub = subscription(plan, quantity);
        mocks.retrieveSubscription.mockResolvedValue(sub);
        const object = type === "checkout.session.completed" ? {
          customer: sub.customer, subscription: sub.id,
          metadata: { companyId: String(ids[0]), plan: "untrusted", quantity: "999" },
        } : sub;
        await webhook(type, object);
        await expectEntitlement(plan, quantity);
        expect(await company()).toMatchObject({
          stripeCustomerId: sub.customer, stripeSubscriptionId: sub.id,
        });
      }
      if (type === "checkout.session.completed") {
        expect(mocks.retrieveSubscription).toHaveBeenCalledWith(
          "sub_billing_fixture", { expand: ["items.data.price.product"] },
        );
      }
      expect(await company(ids[1])).toMatchObject({ plan: "free", stripeSeatQuantity: null });
    },
  );

  it("removes paid access for an unknown active price despite Team metadata", async () => {
    const sub = subscription("professional", 1);
    sub.items.data[0].price.unit_amount = 1;
    await webhook("customer.subscription.updated", sub);
    await expectEntitlement("free", null);
  });

  it("does not acknowledge a verified event when company billing sync fails", async () => {
    mocks.retrieveSubscription.mockRejectedValue(new Error("temporary Stripe read failure"));
    const payload = JSON.stringify({
      id: "evt_retry_fixture",
      object: "event",
      type: "checkout.session.completed",
      data: { object: {
        customer: "cus_billing_fixture",
        subscription: "sub_billing_fixture",
        metadata: { companyId: String(ids[0]) },
      } },
    });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: signingSecret });
    const response = await request(app).post("/api/stripe/webhook")
      .set("Content-Type", "application/json").set("Stripe-Signature", signature).send(payload);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("temporary Stripe read failure");
    expect(await company()).toMatchObject({ plan: "team", stripeSeatQuantity: 25, subscriptionStatus: "active" });
  });

  it.each([0, 1, 9])("removes paid access for Team quantity %i below the minimum", async quantity => {
    await webhook("customer.subscription.updated", subscription("team", quantity));
    await expectEntitlement("free", null);
  });

  it("resolves an unexpanded product and customer metadata before updating the company", async () => {
    const sub = {
      ...subscription(), metadata: {},
      items: { data: [{ quantity: 12, price: { ...price("team"), product: "prod_team" } }] },
    };
    await webhook("customer.subscription.updated", sub);
    await expectEntitlement("team", 12);
    expect(mocks.retrieveCustomer).toHaveBeenCalledWith("cus_billing_fixture");
    expect(mocks.retrieveProduct).toHaveBeenCalledWith("prod_team");
  });

  it.each(["canceled", "unpaid", "incomplete_expired"])("clears the paid plan and seats when %s", async status => {
    await webhook("customer.subscription.deleted", subscription("team", 25, status));
    await expectEntitlement("free", null, status);
  });

  it("revokes active access after an invoice payment fails", async () => {
    await webhook("invoice.payment_failed", {
      id: "in_failed_fixture", customer: "cus_billing_fixture", subscription: "sub_billing_fixture",
    });

    expect(await company()).toMatchObject({
      plan: "team", stripeSeatQuantity: 25, subscriptionStatus: "past_due",
    });
    const response = await request(app).get("/api/stripe/subscription")
      .auth(adminToken, { type: "bearer" });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      plan: "team", seatQuantity: 25,
      hasActiveAccess: false, subscriptionActive: false, teamAccess: false,
    });
  });

  it.each([["professional", 1], ["team", 10], ["team", 21]] as const)(
    "a paid invoice refreshes %s access and quantity %i from the subscription",
    async (plan, quantity) => {
      await db.update(companiesTable).set({ subscriptionStatus: "past_due" })
        .where(eq(companiesTable.id, ids[0]));
      mocks.retrieveSubscription.mockResolvedValue(subscription(plan, quantity));
      await webhook("invoice.payment_succeeded", {
        id: "in_fixture", customer: { id: "cus_billing_fixture" },
        subscription: { id: "sub_billing_fixture" },
      });
      await expectEntitlement(plan, quantity);
      expect((await company()).stripeSubscriptionId).toBe("sub_billing_fixture");
      expect(mocks.retrieveSubscription).toHaveBeenCalledExactlyOnceWith(
        "sub_billing_fixture", { expand: ["items.data.price.product"] },
      );
    },
  );

  it.each(["unknown-price", "below-minimum"])("a paid invoice cannot grant access for %s", async invalid => {
    const sub = subscription("team", invalid === "below-minimum" ? 9 : 12);
    if (invalid === "unknown-price") sub.items.data[0].price.product.name = "Unrecognized product";
    mocks.retrieveSubscription.mockResolvedValue(sub);
    await webhook("invoice.payment_succeeded", {
      customer: "cus_billing_fixture", subscription: "sub_billing_fixture",
    });
    await expectEntitlement("free", null);
  });

  it("ignores invoices without a subscription or without a matching company", async () => {
    await webhook("invoice.payment_succeeded", { customer: "cus_billing_fixture" });
    await webhook("invoice.payment_succeeded", {
      customer: "cus_unknown", subscription: "sub_billing_fixture",
    });
    expect(mocks.retrieveSubscription).not.toHaveBeenCalled();
    await expectEntitlement("team", 25);
  });

  it("rejects missing, invalid, and tampered signatures without changing access", async () => {
    const payload = JSON.stringify({
      type: "customer.subscription.deleted", data: { object: subscription("team", 25, "canceled") },
    });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: signingSecret });
    expect((await request(app).post("/api/stripe/webhook")
      .set("Content-Type", "application/json").send(payload)).status).toBe(400);
    expect(mocks.processWebhook).not.toHaveBeenCalled();
    for (const [body, header] of [[payload, "invalid-signature"], [`${payload} `, signature]]) {
      expect((await request(app).post("/api/stripe/webhook")
        .set("Content-Type", "application/json").set("Stripe-Signature", header).send(body)).status).toBe(400);
    }
    expect(mocks.client).not.toHaveBeenCalled();
    await expectEntitlement("team", 25);
  });
});
