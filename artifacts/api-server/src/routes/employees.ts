import { Router } from "express";
import { db, employeesTable, reviewsTable, feedbackTable, devPlansTable } from "@workspace/db";
import { eq, and, ilike, sql, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
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

router.get("/employees", requireAuth, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const qp = ListEmployeesQueryParams.safeParse(req.query);
  const params = qp.success ? qp.data : {};

  let query = db.select({
    emp: employeesTable,
    managerName: sql<string | null>`m.name`,
  }).from(employeesTable)
    .leftJoin(sql`employees m`, sql`m.id = ${employeesTable.managerId}`)
    .where(eq(employeesTable.companyId, companyId));

  const allEmps = await db
    .select({ emp: employeesTable, managerName: sql<string | null>`m.name` })
    .from(employeesTable)
    .leftJoin(sql`employees m`, sql`m.id = ${employeesTable.managerId}`)
    .where(eq(employeesTable.companyId, companyId));

  let filtered = allEmps;
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
  const { companyId } = req.auth!;
  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { managerId, ...rest } = parsed.data;
  const [emp] = await db.insert(employeesTable).values({ ...rest, companyId, managerId: managerId ?? null }).returning();
  res.status(201).json({
    ...emp,
    managerName: null,
    createdAt: emp.createdAt.toISOString(),
    latestScore: null,
  });
});

router.get("/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const params = GetEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { id } = params.data;

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
  const { companyId } = req.auth!;
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
  const existing = await db.select({ id: employeesTable.id }).from(employeesTable)
    .where(and(eq(employeesTable.id, params.data.id), eq(employeesTable.companyId, companyId))).limit(1);
  if (existing.length === 0) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  const [updated] = await db.update(employeesTable).set(body.data).where(eq(employeesTable.id, params.data.id)).returning();
  res.json({ ...updated, managerName: null, createdAt: updated.createdAt.toISOString(), latestScore: null });
});

router.delete("/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
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
  const { companyId } = req.auth!;
  const params = GetEmployeeScoreHistoryParams.safeParse(req.params);
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
