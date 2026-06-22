import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, employeesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

const _rawSecret = process.env.JWT_SECRET;
if (!_rawSecret) {
  throw new Error("JWT_SECRET environment variable must be set");
}
const JWT_SECRET: string = _rawSecret;

export interface AuthPayload {
  companyId: number;
  userId: number;
  email: string;
  role: string;
  employeeId?: number | null;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

/**
 * Verify and decode the bearer token, then resolve the caller's *live* access
 * role from the database rather than trusting the (potentially stale) role
 * claim baked into the JWT. This ensures admin-driven role changes
 * (promote/demote) take effect on the member's very next request — without
 * waiting for their token to expire or be re-issued.
 *
 * Returns the resolved auth payload, or null after sending the appropriate
 * 401 response (invalid token, or the employee no longer exists).
 */
async function authenticate(req: Request, res: Response): Promise<AuthPayload | null> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const token = header.slice(7);
  let payload: AuthPayload;
  try {
    payload = jwt.verify(token, JWT_SECRET) as unknown as AuthPayload;
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }

  // Company-owner accounts have no employee row; they are always admins.
  if (payload.employeeId == null) {
    req.auth = payload;
    return payload;
  }

  // Employee-backed accounts: resolve the current role from the DB so that
  // role/scope changes are reflected immediately.
  const [emp] = await db
    .select({ userRole: employeesTable.userRole })
    .from(employeesTable)
    .where(and(eq(employeesTable.id, payload.employeeId), eq(employeesTable.companyId, payload.companyId)))
    .limit(1);
  if (!emp) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const resolved: AuthPayload = { ...payload, role: emp.userRole };
  req.auth = resolved;
  return resolved;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = await authenticate(req, res);
  if (!auth) return;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = await authenticate(req, res);
  if (!auth) return;
  if (auth.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

export async function requireManagerOrAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = await authenticate(req, res);
  if (!auth) return;
  if (auth.role !== "admin" && auth.role !== "manager") {
    res.status(403).json({ error: "Manager or admin access required" });
    return;
  }
  next();
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
