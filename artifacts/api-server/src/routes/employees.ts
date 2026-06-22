import { Router } from "express";
import { db, employeesTable, reviewsTable, feedbackTable, devPlansTable } from "@workspace/db";
import { eq, and, sql, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { canAccessEmployee } from "../lib/access";
import {
  CreateEmployeeBody, UpdateEmployeeBody, GetEmployeeParams,
  UpdateEmployeeParams, DeleteEmployeeParams, ListEmployeesQueryParams,
  GetEmployeeScoreHistoryParams
} from "@workspace/api-zod";

const router = Router();

function computeOverall(r: { technicalScore: number | null; communicationScore: number | null; problemSolvingScore: number | null; teamworkScore: number | null; leadershipScore: number | null }): number | null {
  const scores = [r.technicalScore, r.communicationScore, r.problemSolvingScore, r.teamworkScore, r.leadershipScore].filter((s): s is number => s != null);
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

router.get("/employees/me", requireAuth, async (req, res): Promise<void> => {
  const auth = req.auth!;
  const { companyId, email, employeeId } = auth;

  let emps;
  if (employeeId) {
    emps = await db.select({
      emp: employeesTable,
      managerName: sql<string | null>`m.name`,
    }).from(employeesTable)
      .leftJoin(sql`employees m`, sql`m.id = ${employeesTable.managerId}`)
      .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyId, companyId)));
  } else {
    emps = await db.select({
      emp: employeesTable,
      managerName: sql<string | null>`m.name`,
    }).from(employeesTable)
      .leftJoin(sql`employees m`, sql`m.id = ${employeesTable.managerId}`)
      .where(and(eq(employeesTable.email, email), eq(employeesTable.companyId, companyId)));
  }

  if (emps.length === 0) {
    res.status(404).json({ error: "No employee profile found for your account" });
    return;
  }
  const { emp, managerName } = emps[0];

  const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.employeeId, emp.id));
  const [{ cnt: fbCnt }] = await db.select({ cnt: count() }).from(feedbackTable).where(eq(feedbackTable.employeeId, emp.id));
  const devPlanRows = await db.select({ id: devPlansTable.id }).from(devPlansTable).where(eq(devPlansTable.employeeId, emp.id));
  const scores = reviews.map(r => r.overallScore ?? computeOverall(r)).filter((s): s is number => s != null);
  const latestScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  res.json({
    id: emp.id,
    companyId: emp.companyId,
    name: emp.name,
    email: emp.email,
    role: emp.role,
    department: emp.department,
    level: emp.level,
    startDate: emp.startDate,
    managerId: emp.managerId,
    managerName: managerName ?? null,
    createdAt: emp.createdAt.toISOString(),
    latestScore,
    reviewCount: reviews.length,
    feedbackCount: Number(fbCnt),
    hasDevPlan: devPlanRows.length > 0,
  });
});

router.get("/employees", requireAuth, async (req, res): Promise<void> => {
  const auth = req.auth!;
  const { companyId, role, employeeId } = auth;

  if (role === "employee") {
    res.status(403).json({ error: "Employees can only view their own profile. Use /employees/me." });
    return;
  }

  const qp = ListEmployeesQueryParams.safeParse(req.query);
  const params = qp.success ? qp.data : {};

  const allEmps = await db
    .select({ emp: employeesTable, managerName: sql<string | null>`m.name` })
    .from(employeesTable)
    .leftJoin(sql`employees m`, sql`m.id = ${employeesTable.managerId}`)
    .where(eq(employeesTable.companyId, companyId));

  let filtered = allEmps;

  if (role === "manager" && employeeId) {
    filtered = filtered.filter(r => r.emp.managerId === employeeId || r.emp.id === employeeId);
  }

  if (params.search) {
    const s = params.search.toLowerCase();
    filtered = filtered.filter(r => r.emp.name.toLowerCase().includes(s) || r.emp.email.toLowerCase().includes(s) || r.emp.role.toLowerCase().includes(s));
  }
  if (params.department) {
    filtered = filtered.filter(r => r.emp.department === params.department);
  }
  if (params.level) {
    filtered = filtered.filter(r => r.emp.level === params.level);
  }

  const empIds = filtered.map(e => e.emp.id);
  const latestScores: Record<number, number | null> = {};
  if (empIds.length > 0) {
    const reviews = await db.select({
      employeeId: reviewsTable.employeeId,
      technicalScore: reviewsTable.technicalScore,
      communicationScore: reviewsTable.communicationScore,
      problemSolvingScore: reviewsTable.problemSolvingScore,
      teamworkScore: reviewsTable.teamworkScore,
      leadershipScore: reviewsTable.leadershipScore,
      overallScore: reviewsTable.overallScore,
    }).from(reviewsTable).where(sql`${reviewsTable.employeeId} = ANY(ARRAY[${sql.join(empIds.map(id => sql`${id}`), sql`, `)}]::integer[])`);

    for (const empId of empIds) {
      const empReviews = reviews.filter(r => r.employeeId === empId);
      if (empReviews.length === 0) { latestScores[empId] = null; continue; }
      const scores = empReviews.map(r => r.overallScore ?? computeOverall(r)).filter((s): s is number => s != null);
      latestScores[empId] = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    }
  }

  const result = filtered.map(r => ({
    id: r.emp.id,
    companyId: r.emp.companyId,
    name: r.emp.name,
    email: r.emp.email,
    role: r.emp.role,
    userRole: r.emp.userRole,
    department: r.emp.department,
    level: r.emp.level,
    startDate: r.emp.startDate,
    managerId: r.emp.managerId,
    managerName: r.managerName ?? null,
    createdAt: r.emp.createdAt.toISOString(),
    latestScore: latestScores[r.emp.id] ?? null,
  }));

  res.json(result);
});

router.post("/employees", requireAuth, async (req, res): Promise<void> => {
  const auth = req.auth!;
  const { companyId, role } = auth;

  if (role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { managerId, ...rest } = parsed.data;
  if (managerId != null) {
    const managerCheck = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(and(eq(employeesTable.id, managerId), eq(employeesTable.companyId, companyId))).limit(1);
    if (managerCheck.length === 0) {
      res.status(400).json({ error: "Manager not found in your company" });
      return;
    }
  }
  const [emp] = await db.insert(employeesTable).values({ ...rest, companyId, managerId: managerId ?? null }).returning();
  res.status(201).json({
    ...emp,
    managerName: null,
    createdAt: emp.createdAt.toISOString(),
    latestScore: null,
  });
});

router.get("/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const auth = req.auth!;
  const { companyId, role, employeeId: authEmployeeId } = auth;
  const params = GetEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { id } = params.data;

  if (role === "employee" && authEmployeeId !== id) {
    res.status(403).json({ error: "You can only view your own profile" });
    return;
  }

  const emps = await db.select({
    emp: employeesTable,
    managerName: sql<string | null>`m.name`,
  }).from(employeesTable)
    .leftJoin(sql`employees m`, sql`m.id = ${employeesTable.managerId}`)
    .where(and(eq(employeesTable.id, id), eq(employeesTable.companyId, companyId)));

  if (emps.length === 0) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  const { emp, managerName } = emps[0];

  if (role === "manager" && authEmployeeId !== id && emp.managerId !== authEmployeeId) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.employeeId, id));
  const [{ cnt: fbCnt }] = await db.select({ cnt: count() }).from(feedbackTable).where(eq(feedbackTable.employeeId, id));
  const devPlanRows = await db.select({ id: devPlansTable.id }).from(devPlansTable).where(eq(devPlansTable.employeeId, id));

  const scores = reviews.map(r => r.overallScore ?? computeOverall(r)).filter((s): s is number => s != null);
  const latestScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  res.json({
    id: emp.id,
    companyId: emp.companyId,
    name: emp.name,
    email: emp.email,
    role: emp.role,
    department: emp.department,
    level: emp.level,
    startDate: emp.startDate,
    managerId: emp.managerId,
    managerName: managerName ?? null,
    createdAt: emp.createdAt.toISOString(),
    latestScore,
    reviewCount: reviews.length,
    feedbackCount: Number(fbCnt),
    hasDevPlan: devPlanRows.length > 0,
  });
});

router.patch("/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const auth = req.auth!;
  const { companyId, role, employeeId: authEmployeeId } = auth;
  const params = UpdateEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateEmployeeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const isSelf = authEmployeeId != null && authEmployeeId === params.data.id;
  if (role !== "admin" && !isSelf) {
    res.status(403).json({ error: "Only admins can edit other employees" });
    return;
  }

  const existing = await db.select({ id: employeesTable.id }).from(employeesTable)
    .where(and(eq(employeesTable.id, params.data.id), eq(employeesTable.companyId, companyId))).limit(1);
  if (existing.length === 0) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  let updateData = body.data;
  if (role !== "admin") {
    const { role: _role, level: _level, department: _dept, managerId: _mgr, userRole: _userRole, ...allowedFields } = updateData as Record<string, unknown>;
    updateData = allowedFields as typeof body.data;
  }

  if (role === "admin" && body.data.managerId != null) {
    if (body.data.managerId === params.data.id) {
      res.status(400).json({ error: "An employee cannot be their own manager" });
      return;
    }
    const managerCheck = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(and(eq(employeesTable.id, body.data.managerId), eq(employeesTable.companyId, companyId))).limit(1);
    if (managerCheck.length === 0) {
      res.status(400).json({ error: "Manager not found in your company" });
      return;
    }
  }
  const [updated] = await db.update(employeesTable).set(updateData).where(eq(employeesTable.id, params.data.id)).returning();
  res.json({ ...updated, managerName: null, createdAt: updated.createdAt.toISOString(), latestScore: null });
});

router.delete("/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const auth = req.auth!;
  const { companyId, role } = auth;

  if (role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const params = DeleteEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const existing = await db.select({ id: employeesTable.id }).from(employeesTable)
    .where(and(eq(employeesTable.id, params.data.id), eq(employeesTable.companyId, companyId))).limit(1);
  if (existing.length === 0) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  await db.delete(employeesTable).where(eq(employeesTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/employees/:id/score-history", requireAuth, async (req, res): Promise<void> => {
  const auth = req.auth!;
  const { companyId, role, employeeId: authEmployeeId } = auth;
  const params = GetEmployeeScoreHistoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (role === "employee" && authEmployeeId !== params.data.id) {
    res.status(403).json({ error: "You can only view your own score history" });
    return;
  }

  if (!(await canAccessEmployee(auth, params.data.id))) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  const existing = await db.select({ id: employeesTable.id }).from(employeesTable)
    .where(and(eq(employeesTable.id, params.data.id), eq(employeesTable.companyId, companyId))).limit(1);
  if (existing.length === 0) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.employeeId, params.data.id));
  const result = reviews.map(r => ({
    reviewId: r.id,
    reviewType: r.reviewType,
    period: r.period,
    overallScore: r.overallScore ?? computeOverall(r),
    technicalScore: r.technicalScore,
    communicationScore: r.communicationScore,
    problemSolvingScore: r.problemSolvingScore,
    teamworkScore: r.teamworkScore,
    leadershipScore: r.leadershipScore,
    createdAt: r.createdAt.toISOString(),
  }));
  res.json(result);
});

export default router;
