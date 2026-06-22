import { db, employeesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import type { AuthPayload } from "../middlewares/auth";

/**
 * Can the authenticated user VIEW the given employee's data?
 * - admins: any employee in their company
 * - managers: themselves or their direct reports
 * - employees: only themselves
 */
export async function canAccessEmployee(auth: AuthPayload, employeeId: number): Promise<boolean> {
  if (auth.role === "admin") return true;
  if (auth.employeeId && auth.employeeId === employeeId) return true;
  if (auth.role === "manager" && auth.employeeId) {
    const [emp] = await db
      .select({ managerId: employeesTable.managerId })
      .from(employeesTable)
      .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyId, auth.companyId)))
      .limit(1);
    return !!emp && emp.managerId === auth.employeeId;
  }
  return false;
}

/**
 * Can the authenticated user MANAGE (evaluate / send requests for) the given
 * employee? Admins and managers (for themselves or their direct reports) only.
 * Plain employees can never manage.
 */
export async function managerCanAccessEmployee(auth: AuthPayload, employeeId: number): Promise<boolean> {
  if (auth.role === "admin") return true;
  if (auth.role === "manager" && auth.employeeId) {
    if (auth.employeeId === employeeId) return true;
    const [emp] = await db
      .select({ managerId: employeesTable.managerId })
      .from(employeesTable)
      .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyId, auth.companyId)))
      .limit(1);
    return !!emp && emp.managerId === auth.employeeId;
  }
  return false;
}
