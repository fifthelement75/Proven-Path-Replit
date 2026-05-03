import { Router } from "express";
import { db, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { getUncachableStripeClient } from "../lib/stripeClient";
import { logger } from "../lib/logger";

const router = Router();

const PRO_PRODUCT_NAME = "Proven Path Pro";

let cachedPriceId: string | null = null;
let cachedPriceAt = 0;
const PRICE_CACHE_MS = 60_000;

async function getProMonthlyPriceId(): Promise<string> {
  if (cachedPriceId && Date.now() - cachedPriceAt < PRICE_CACHE_MS) {
    return cachedPriceId;
  }
  const stripe = await getUncachableStripeClient();
  const products = await stripe.products.search({ query: `name:'${PRO_PRODUCT_NAME}' AND active:'true'` });
  if (products.data.length === 0) {
    throw new Error(`Stripe product "${PRO_PRODUCT_NAME}" not found. Run the seed script: pnpm --filter @workspace/api-server exec tsx src/scripts/seedStripeProducts.ts`);
  }
  const product = products.data[0];
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
  const monthly = prices.data.find((p) => p.recurring?.interval === "month") ?? prices.data[0];
  if (!monthly) throw new Error(`No active price found for product ${product.id}`);
  cachedPriceId = monthly.id;
  cachedPriceAt = Date.now();
  return monthly.id;
}

const ALLOWED_HOST_SUFFIXES = [".replit.dev", ".replit.app", ".provenpath.app", "provenpath.app", "localhost"];

function getBaseUrl(req: any): string {
  // Prefer an explicitly configured public origin (deployment), so Stripe return URLs
  // don't depend on attacker-controllable Host / X-Forwarded-* headers.
  const configured = process.env.APP_PUBLIC_URL;
  if (configured) return configured.replace(/\/$/, "");

  const rawHost = String(req.get("host") || "");
  const host = rawHost.split(":")[0];
  const isAllowed = ALLOWED_HOST_SUFFIXES.some(
    (s) => host === s || host.endsWith(s),
  );
  if (!isAllowed) {
    throw new Error(`Refusing to build Stripe return URL for untrusted host: ${rawHost}`);
  }
  const proto = req.get("x-forwarded-proto") || req.protocol || "https";
  return `${proto}://${rawHost}`;
}

router.get("/stripe/config", async (_req, res) => {
  try {
    const { getStripePublishableKey } = await import("../lib/stripeClient");
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch (err: any) {
    logger.error({ err }, "Failed to load stripe config");
    res.status(503).json({ error: "Stripe not configured" });
  }
});

router.post("/stripe/checkout", requireAuth, async (req, res): Promise<void> => {
  const auth = req.auth!;
  if (auth.role !== "admin") {
    res.status(403).json({ error: "Only company admins can manage billing" });
    return;
  }

  try {
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, auth.companyId)).limit(1);
    if (!company) {
      res.status(404).json({ error: "Company not found" });
      return;
    }

    const stripe = await getUncachableStripeClient();
    let customerId = company.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: company.email,
        name: company.name,
        metadata: { companyId: String(company.id) },
      });
      customerId = customer.id;
      await db.update(companiesTable).set({ stripeCustomerId: customerId }).where(eq(companiesTable.id, company.id));
    }

    const priceId = await getProMonthlyPriceId();
    const baseUrl = getBaseUrl(req);
    const successUrl = `${baseUrl}/billing?checkout=success`;
    const cancelUrl = `${baseUrl}/billing?checkout=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { companyId: String(company.id) },
      subscription_data: { metadata: { companyId: String(company.id) } },
      allow_promotion_codes: true,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "Failed to create stripe checkout session");
    res.status(500).json({ error: err?.message || "Failed to create checkout session" });
  }
});

router.post("/stripe/portal", requireAuth, async (req, res): Promise<void> => {
  const auth = req.auth!;
  if (auth.role !== "admin") {
    res.status(403).json({ error: "Only company admins can manage billing" });
    return;
  }
  try {
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, auth.companyId)).limit(1);
    if (!company?.stripeCustomerId) {
      res.status(400).json({ error: "No Stripe customer on file" });
      return;
    }
    const stripe = await getUncachableStripeClient();
    const baseUrl = getBaseUrl(req);
    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripeCustomerId,
      return_url: `${baseUrl}/billing`,
    });
    res.json({ url: session.url });
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "Failed to create stripe portal session");
    res.status(500).json({ error: err?.message || "Failed to open billing portal" });
  }
});

router.get("/stripe/subscription", requireAuth, async (req, res): Promise<void> => {
  const auth = req.auth!;
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, auth.companyId)).limit(1);
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  const now = new Date();
  const trialActive = company.trialEndsAt ? company.trialEndsAt.getTime() > now.getTime() : false;
  const trialDaysRemaining = company.trialEndsAt
    ? Math.max(0, Math.ceil((company.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const subscriptionActive = company.subscriptionStatus === "active" || company.subscriptionStatus === "trialing";
  res.json({
    plan: company.plan,
    subscriptionStatus: company.subscriptionStatus,
    trialEndsAt: company.trialEndsAt,
    trialActive,
    trialDaysRemaining,
    hasActiveAccess: subscriptionActive || trialActive,
    subscriptionActive,
  });
});

export default router;
