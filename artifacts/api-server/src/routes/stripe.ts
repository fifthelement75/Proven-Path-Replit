import { Router } from "express";
import { db, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { getUncachableStripeClient } from "../lib/stripeClient";
import { logger } from "../lib/logger";
import { getMonthlyPriceId, validateCheckoutSelection } from "./stripeHelpers";
import { canonicalPlan, hasActiveAccess } from "../lib/entitlements";

const router = Router();

const ALLOWED_HOST_SUFFIXES = [".replit.dev", ".replit.app", ".provenpath.app", "provenpath.app", "localhost"];

function getBaseUrl(req: any): string {
  const configured = process.env.APP_PUBLIC_URL;
  if (configured) return configured.replace(/\/$/, "");

  const rawHost = String(req.get("host") || "");
  const host = rawHost.split(":")[0];
  const isAllowed = ALLOWED_HOST_SUFFIXES.some((s) => host === s || host.endsWith(s));
  if (!isAllowed) throw new Error(`Refusing to build Stripe return URL for untrusted host: ${rawHost}`);
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
  const selection = validateCheckoutSelection(req.body);
  if (!selection.data) {
    res.status(400).json({ error: selection.error });
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

    const { plan, quantity } = selection.data;
    const priceId = await getMonthlyPriceId(plan);
    const baseUrl = getBaseUrl(req);
    const metadata = { companyId: String(company.id), plan, quantity: String(quantity) };
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity }],
      success_url: `${baseUrl}/billing?checkout=success`,
      cancel_url: `${baseUrl}/billing?checkout=cancel`,
      metadata,
      subscription_data: { metadata },
      allow_promotion_codes: true,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    req.log?.error({ err: err?.message || err }, "Failed to create stripe checkout session");
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
    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripeCustomerId,
      return_url: `${getBaseUrl(req)}/billing`,
    });
    res.json({ url: session.url });
  } catch (err: any) {
    req.log?.error({ err: err?.message || err }, "Failed to open stripe portal");
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
  const plan = canonicalPlan(company.plan);
  res.json({
    plan,
    seatQuantity: company.stripeSeatQuantity,
    subscriptionStatus: company.subscriptionStatus,
    trialEndsAt: company.trialEndsAt,
    trialActive,
    trialDaysRemaining,
    hasActiveAccess: hasActiveAccess(company),
    subscriptionActive: subscriptionActive && (plan === "professional" || plan === "team"),
  });
});

export default router;