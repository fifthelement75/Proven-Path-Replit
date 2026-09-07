import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { getCompanyEntitlements, hasActiveAccess, isTeamEntitled } from "../lib/entitlements";

export async function requireActivePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.auth;
  if (!auth) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const company = await getCompanyEntitlements(db, auth.companyId);
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  if (hasActiveAccess(company)) {
    next();
    return;
  }
  res.status(402).json({
    error: "Your free trial has ended. Upgrade your plan to continue using this feature.",
    code: "subscription_required",
  });
}

/** Team-only features, evaluated against live company state rather than JWT claims. */
export async function requireTeamPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.auth;
  if (!auth) { res.status(401).json({ error: "Unauthorized" }); return; }
  const company = await getCompanyEntitlements(db, auth.companyId);
  if (!company) { res.status(404).json({ error: "Company not found" }); return; }
  if (isTeamEntitled(company)) { next(); return; }
  res.status(403).json({
    error: "This feature is available on the Team plan.",
    code: "team_plan_required",
  });
}
