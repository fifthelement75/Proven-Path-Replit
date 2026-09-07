import { Router } from "express";
import { db, companiesTable, promoCodesTable, promoCodeRedemptionsTable } from "@workspace/db";
import { eq, and, isNull, gt, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { getUncachableStripeClient } from "../lib/stripeClient";
import { logger } from "../lib/logger";

const router = Router();

async function validateCode(code: string, companyId: number): Promise<{ valid: boolean; message: string; promoCode?: typeof promoCodesTable.$inferSelect }> {
  const upper = code.trim().toUpperCase();

  const [promo] = await db
    .select()
    .from(promoCodesTable)
    .where(eq(promoCodesTable.code, upper))
    .limit(1);

  if (!promo) return { valid: false, message: "Invalid promo code." };
  if (!promo.isActive) return { valid: false, message: "This promo code is no longer active." };

  const now = new Date();
  if (promo.expiresAt && promo.expiresAt <= now) {
    return { valid: false, message: "This promo code has expired." };
  }

  if (promo.maxUses !== null && promo.timesUsed >= promo.maxUses) {
    return { valid: false, message: "This promo code has reached its usage limit." };
  }

  const [existing] = await db
    .select()
    .from(promoCodeRedemptionsTable)
    .where(
      and(
        eq(promoCodeRedemptionsTable.companyId, companyId),
        eq(promoCodeRedemptionsTable.promoCodeId, promo.id),
      ),
    )
    .limit(1);

  if (existing) {
    return { valid: false, message: "You've already redeemed this promo code." };
  }

  return { valid: true, message: "Promo code valid!", promoCode: promo };
}

router.post("/promo/validate", requireAuth, async (req, res): Promise<void> => {
  const { code } = req.body as { code?: string };
  if (!code) {
    res.status(400).json({ valid: false, message: "Code is required." });
    return;
  }

  try {
    const { valid, message } = await validateCode(code, req.auth!.companyId);
    res.json({ valid, message });
  } catch (err: any) {
    logger.error({ err }, "promo/validate error");
    res.status(500).json({ valid: false, message: "Could not validate code. Try again." });
  }
});

router.post("/promo/apply", requireAuth, async (req, res): Promise<void> => {
  const auth = req.auth!;
  if (auth.role !== "admin") {
    res.status(403).json({ success: false, message: "Only company admins can apply promo codes." });
    return;
  }

  const { code } = req.body as { code?: string };
  if (!code) {
    res.status(400).json({ success: false, message: "Code is required." });
    return;
  }

  try {
    const { valid, message, promoCode } = await validateCode(code, auth.companyId);
    if (!valid || !promoCode) {
      res.status(400).json({ success: false, message });
      return;
    }

    const [company] = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.id, auth.companyId))
      .limit(1);

    if (!company) {
      res.status(404).json({ success: false, message: "Company not found." });
      return;
    }

    if (company.subscriptionStatus === "active" || company.subscriptionStatus === "trialing") {
      res.status(400).json({ success: false, message: "Your account already has an active subscription." });
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
      await db
        .update(companiesTable)
        .set({ stripeCustomerId: customerId })
        .where(eq(companiesTable.id, company.id));
    }

    const { getMonthlyPriceId } = await import("./stripeHelpers");
    const plan = "professional";
    const priceId = await getMonthlyPriceId(plan);

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId, quantity: 1 }],
      trial_period_days: 30,
      metadata: { companyId: String(company.id), plan, quantity: "1" },
      payment_settings: { save_default_payment_method: "on_subscription" },
      trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
    });

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);

    await db
      .update(companiesTable)
      .set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: "trialing",
        plan,
        trialEndsAt: trialEnd,
      })
      .where(eq(companiesTable.id, company.id));

    await db
      .update(promoCodesTable)
      .set({ timesUsed: promoCode.timesUsed + 1 })
      .where(eq(promoCodesTable.id, promoCode.id));

    await db.insert(promoCodeRedemptionsTable).values({
      companyId: company.id,
      promoCodeId: promoCode.id,
    });

    logger.info({ companyId: company.id, code: promoCode.code }, "Promo code applied");
    res.json({
      success: true,
      message: `${promoCode.code} applied! Enjoy 1 month free.`,
      trialEndsAt: trialEnd.toISOString(),
    });
  } catch (err: any) {
    logger.error({ err }, "promo/apply error");
    res.status(500).json({ success: false, message: err?.message || "Failed to apply promo code." });
  }
});

export default router;
