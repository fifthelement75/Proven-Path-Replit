import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, companiesTable, employeesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
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
  const trimmedName = companyName.trim();
  if (!trimmedName) {
    res.status(400).json({ error: "Company name is required" });
    return;
  }

  const existing = await db.select().from(companiesTable).where(eq(companiesTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const nameTaken = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(sql`lower(${companiesTable.name}) = lower(${trimmedName})`)
    .limit(1);
  if (nameTaken.length > 0) {
    res.status(409).json({ error: "That organization name is already taken. Please choose a different one." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  let company;
  try {
    [company] = await db
      .insert(companiesTable)
      .values({ name: trimmedName, email, passwordHash, plan: "trial", trialEndsAt })
      .returning();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/companies_name_lower_unique/i.test(msg)) {
      res.status(409).json({ error: "That organization name is already taken. Please choose a different one." });
      return;
    }
    throw err;
  }

  const token = signToken({ companyId: company.id, userId: company.id, email: company.email, role: "admin", employeeId: null });
  res.status(201).json({
    token,
    trialJustStarted: true,
    trialEndsAt: company.trialEndsAt,
    user: { id: company.id, email: company.email, companyId: company.id, companyName: company.name, role: "admin", employeeId: null }
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
  if (company) {
    const valid = await bcrypt.compare(password, company.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const token = signToken({ companyId: company.id, userId: company.id, email: company.email, role: "admin", employeeId: null });
    res.json({
      token,
      user: { id: company.id, email: company.email, companyId: company.id, companyName: company.name, role: "admin", employeeId: null }
    });
    return;
  }

  const employees = await db
    .select({ emp: employeesTable, companyName: companiesTable.name })
    .from(employeesTable)
    .leftJoin(companiesTable, eq(employeesTable.companyId, companiesTable.id))
    .where(eq(employeesTable.email, email))
    .limit(1);

  if (!employees.length || !employees[0].emp.passwordHash) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const { emp, companyName } = employees[0];
  const valid = await bcrypt.compare(password, emp.passwordHash!);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken({
    companyId: emp.companyId,
    userId: emp.id,
    email: emp.email,
    role: emp.userRole,
    employeeId: emp.id,
  });
  res.json({
    token,
    user: {
      id: emp.id,
      email: emp.email,
      companyId: emp.companyId,
      companyName: companyName || "",
      role: emp.userRole,
      employeeId: emp.id,
    }
  });
});

router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const auth = req.auth!;
  const body = (req.body ?? {}) as { currentPassword?: unknown; newPassword?: unknown };

  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword) {
    res.status(400).json({ error: "Current password is required" });
    return;
  }
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters" });
    return;
  }

  if (auth.role === "admin") {
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, auth.companyId)).limit(1);
    if (!company) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const valid = await bcrypt.compare(currentPassword, company.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(companiesTable).set({ passwordHash }).where(eq(companiesTable.id, company.id));
    res.json({ message: "Password updated" });
    return;
  }

  if (auth.employeeId) {
    const [emp] = await db
      .select()
      .from(employeesTable)
      .where(and(eq(employeesTable.id, auth.employeeId), eq(employeesTable.companyId, auth.companyId)))
      .limit(1);
    if (!emp || !emp.passwordHash) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const valid = await bcrypt.compare(currentPassword, emp.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(employeesTable).set({ passwordHash }).where(eq(employeesTable.id, emp.id));
    res.json({ message: "Password updated" });
    return;
  }

  res.status(401).json({ error: "Unauthorized" });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ message: "Logged out" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const auth = req.auth!;

  if (auth.role === "admin") {
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, auth.companyId)).limit(1);
    if (!company) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    res.json({
      id: company.id,
      email: company.email,
      companyId: company.id,
      companyName: company.name,
      role: "admin",
      employeeId: null,
      name: company.name,
      profilePhotoUrl: company.profilePhotoUrl ?? null,
    });
    return;
  }

  if (auth.employeeId) {
    const employees = await db
      .select({ emp: employeesTable, companyName: companiesTable.name })
      .from(employeesTable)
      .leftJoin(companiesTable, eq(employeesTable.companyId, companiesTable.id))
      .where(and(eq(employeesTable.id, auth.employeeId), eq(employeesTable.companyId, auth.companyId)))
      .limit(1);

    if (!employees.length) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { emp, companyName } = employees[0];
    res.json({
      id: emp.id,
      email: emp.email,
      companyId: emp.companyId,
      companyName: companyName || "",
      role: emp.userRole,
      employeeId: emp.id,
      name: emp.name,
      profilePhotoUrl: emp.profilePhotoUrl ?? null,
      jobRole: emp.role,
      department: emp.department,
    });
    return;
  }

  res.status(401).json({ error: "Unauthorized" });
});

router.patch("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const auth = req.auth!;
  const body = (req.body ?? {}) as {
    name?: unknown;
    profilePhotoUrl?: unknown;
    jobRole?: unknown;
    department?: unknown;
  };

  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const profilePhotoUrl =
    body.profilePhotoUrl === null
      ? null
      : typeof body.profilePhotoUrl === "string"
      ? body.profilePhotoUrl
      : undefined;
  const jobRole = typeof body.jobRole === "string" ? body.jobRole.trim() : undefined;
  const department = typeof body.department === "string" ? body.department.trim() : undefined;

  if (typeof profilePhotoUrl === "string" && profilePhotoUrl.length > 2_000_000) {
    res.status(413).json({ error: "Profile photo too large (max ~1.5MB)" });
    return;
  }
  if (name !== undefined && name.length === 0) {
    res.status(400).json({ error: "Name cannot be empty" });
    return;
  }

  if (auth.role === "admin") {
    const updates: Partial<typeof companiesTable.$inferInsert> = {};
    if (name !== undefined) updates.name = name;
    if (profilePhotoUrl !== undefined) updates.profilePhotoUrl = profilePhotoUrl;
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    const [company] = await db
      .update(companiesTable)
      .set(updates)
      .where(eq(companiesTable.id, auth.companyId))
      .returning();
    res.json({
      id: company.id,
      email: company.email,
      companyId: company.id,
      companyName: company.name,
      role: "admin",
      employeeId: null,
      name: company.name,
      profilePhotoUrl: company.profilePhotoUrl ?? null,
    });
    return;
  }

  if (auth.employeeId) {
    const updates: Partial<typeof employeesTable.$inferInsert> = {};
    if (name !== undefined) updates.name = name;
    if (profilePhotoUrl !== undefined) updates.profilePhotoUrl = profilePhotoUrl;
    if (jobRole !== undefined && jobRole.length > 0) updates.role = jobRole;
    if (department !== undefined && department.length > 0) updates.department = department;
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    const [emp] = await db
      .update(employeesTable)
      .set(updates)
      .where(and(eq(employeesTable.id, auth.employeeId), eq(employeesTable.companyId, auth.companyId)))
      .returning();
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, emp.companyId)).limit(1);
    res.json({
      id: emp.id,
      email: emp.email,
      companyId: emp.companyId,
      companyName: company?.name || "",
      role: emp.userRole,
      employeeId: emp.id,
      name: emp.name,
      profilePhotoUrl: emp.profilePhotoUrl ?? null,
      jobRole: emp.role,
      department: emp.department,
    });
    return;
  }

  res.status(401).json({ error: "Unauthorized" });
});

export default router;
