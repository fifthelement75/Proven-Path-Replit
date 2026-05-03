import type { Request, Response, NextFunction } from "express";
import { db, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function requireActivePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.auth;
  if (!auth) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, auth.companyId)).limit(1);
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  const now = Date.now();
  const trialActive = company.trialEndsAt ? company.trialEndsAt.getTime() > now : false;
  const subscriptionActive = company.subscriptionStatus === "active" || company.subscriptionStatus === "trialing";
  if (trialActive || subscriptionActive) {
    next();
    return;
  }
  res.status(402).json({
    error: "Your free trial has ended. Upgrade your plan to continue using this feature.",
    code: "subscription_required",
  });
}
