import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, companiesTable, employeesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../middlewares/auth";
import { RegisterCompanyBody, LoginBody } from "@workspace/api-zod";

const router = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { companyName, email, password } = parsed.data;

  const existing = await db.select().from(companiesTable).where(eq(companiesTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [company] = await db.insert(companiesTable).values({ name: companyName, email, passwordHash }).returning();

  const token = signToken({ companyId: company.id, userId: company.id, email: company.email, role: "admin" });
  res.status(201).json({
    token,
    user: { id: company.id, email: company.email, companyId: company.id, companyName: company.name, role: "admin" }
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.email, email)).limit(1);
  if (!company) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, company.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken({ companyId: company.id, userId: company.id, email: company.email, role: "admin" });
  res.json({
    token,
    user: { id: company.id, email: company.email, companyId: company.id, companyName: company.name, role: "admin" }
  });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ message: "Logged out" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const auth = req.auth!;
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, auth.companyId)).limit(1);
  if (!company) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json({ id: company.id, email: company.email, companyId: company.id, companyName: company.name, role: "admin" });
});

export default router;
