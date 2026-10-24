import { companiesTable, employeesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

/**
 * Plans are resolved from the company on every request.  JWTs intentionally
 * contain no entitlement data, so upgrades and downgrades take effect at once.
 */
export type CanonicalPlan = "professional" | "team" | "trial" | "free";

export function canonicalPlan(plan: string | null | undefined): CanonicalPlan {
  if (plan === "team") return "team";
  // "pro" was the historical Stripe value and remains a Professional alias.
  if (plan === "professional" || plan === "pro") return "professional";
  return plan === "trial" ? "trial" : "free";
}

export function hasActiveAccess(company: typeof companiesTable.$inferSelect): boolean {
  if (company.complimentaryTeamAccess === true) return true;
  const trialActive = (company.trialEndsAt?.getTime() ?? 0) > Date.now();
  const plan = canonicalPlan(company.plan);
  const paidActive = (company.subscriptionStatus === "active" || company.subscriptionStatus === "trialing")
    && (plan === "professional" || plan === "team");
  return trialActive || paidActive;
}

export function isTeamEntitled(company: typeof companiesTable.$inferSelect): boolean {
  if (company.complimentaryTeamAccess === true) return true;
  // An active trial exposes the Team experience; a paid company must be Team.
  return hasActiveAccess(company) && (canonicalPlan(company.plan) === "team" || canonicalPlan(company.plan) === "trial");
}

export function employeeSeatLimit(company: typeof companiesTable.$inferSelect): number | null {
  if (company.complimentaryTeamAccess === true) return Number.POSITIVE_INFINITY;
  if ((company.trialEndsAt?.getTime() ?? 0) > Date.now()) return Number.POSITIVE_INFINITY;
  if (!hasActiveAccess(company)) return null;
  const plan = canonicalPlan(company.plan);
  if (plan === "professional") return 1;
  if (plan === "team" && company.stripeSeatQuantity && company.stripeSeatQuantity >= 10) {
    return company.stripeSeatQuantity;
  }
  return null;
}

export async function getCompanyEntitlements(db: any, companyId: number) {
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId)).limit(1);
  return company;
}

export async function requireTeamEntitlement(db: any, companyId: number): Promise<"ok" | "missing" | "upgrade"> {
  const company = await getCompanyEntitlements(db, companyId);
  if (!company) return "missing";
  return isTeamEntitled(company) ? "ok" : "upgrade";
}

/** Must be called inside a transaction before any employee insert. */
export async function assertEmployeeSeat(tx: any, companyId: number): Promise<void> {
  // Serialize seat checks per company. This closes the check-then-insert race
  // across direct creation, invitation acceptance, and inbound sync.
  await tx.execute(sql`select pg_advisory_xact_lock(${companyId})`);
  const [company] = await tx.select().from(companiesTable).where(eq(companiesTable.id, companyId)).limit(1);
  if (!company) throw new Error("Company not found");
  const plan = canonicalPlan(company.plan);
  const seatLimit = employeeSeatLimit(company);
  if (seatLimit === Number.POSITIVE_INFINITY) return;
  if (seatLimit == null) {
    const hasRecognizedActivePlan = hasActiveAccess(company);
    const error = new Error(
      hasRecognizedActivePlan
        ? "Your subscription does not have a valid seat quantity. Update billing before adding members."
        : "An active Professional or Team subscription is required to add members.",
    );
    (error as Error & { code?: string }).code = hasRecognizedActivePlan ? "invalid_seat_quantity" : "active_plan_required";
    throw error;
  }
  const [{ value }] = await tx.select({ value: sql<number>`count(*)` }).from(employeesTable)
    .where(eq(employeesTable.companyId, companyId));
  const employeeCount = Number(value);
  if (employeeCount >= seatLimit) {
    const error = new Error(
      plan === "professional"
        ? "Professional plan includes one employee. Upgrade to Team to add more members."
        : `Your Team subscription includes ${seatLimit} seats. Add seats in billing before adding more members.`,
    );
    (error as Error & { code?: string }).code = plan === "professional" ? "professional_seat_limit" : "team_seat_limit";
    throw error;
  }
}