import { Router } from "express";
import { db, shareLinksTable, employeesTable, reviewsTable, feedbackTable, devPlansTable, devPlanSkillsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { CreateShareLinkParams, CreateShareLinkBody, ListShareLinksParams, GetPublicProfileParams } from "@workspace/api-zod";
import crypto from "crypto";

const router = Router();

function getBaseUrl(req: any): string {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) {
    return `https://${domains.split(",")[0]}`;
  }
  return `${req.protocol}://${req.get("host")}`;
}

router.post("/employees/:employeeId/share", requireAuth, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const params = CreateShareLinkParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = CreateShareLinkBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const empCheck = await db.select({ id: employeesTable.id }).from(employeesTable)
    .where(and(eq(employeesTable.id, params.data.employeeId), eq(employeesTable.companyId, companyId))).limit(1);
  if (empCheck.length === 0) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  let expiresAt: Date | null = null;
  if (body.data.expiresIn === "7days") expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  else if (body.data.expiresIn === "30days") expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [link] = await db.insert(shareLinksTable).values({
    employeeId: params.data.employeeId,
    token,
    expiresAt,
  }).returning();

  const baseUrl = getBaseUrl(req);
  res.status(201).json({
    id: link.id,
    employeeId: link.employeeId,
    token: link.token,
    expiresAt: link.expiresAt?.toISOString() ?? null,
    createdAt: link.createdAt.toISOString(),
    url: `${baseUrl}/share/${token}`,
  });
});

router.get("/employees/:employeeId/share", requireAuth, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const params = ListShareLinksParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const empCheck = await db.select({ id: employeesTable.id }).from(employeesTable)
    .where(and(eq(employeesTable.id, params.data.employeeId), eq(employeesTable.companyId, companyId))).limit(1);
  if (empCheck.length === 0) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  const links = await db.select().from(shareLinksTable).where(eq(shareLinksTable.employeeId, params.data.employeeId));
  const baseUrl = getBaseUrl(req);
  res.json(links.map(l => ({
    id: l.id,
    employeeId: l.employeeId,
    token: l.token,
    expiresAt: l.expiresAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
    url: `${baseUrl}/share/${l.token}`,
  })));
});

router.get("/share/:token", async (req, res): Promise<void> => {
  const params = GetPublicProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { token } = params.data;

  const [link] = await db.select().from(shareLinksTable).where(eq(shareLinksTable.token, token)).limit(1);
  if (!link) {
    res.status(404).json({ error: "Share link not found" });
    return;
  }
  if (link.expiresAt && link.expiresAt < new Date()) {
    res.status(404).json({ error: "Share link has expired" });
    return;
  }

  const [emp] = await db.select({
    emp: employeesTable,
  }).from(employeesTable).where(eq(employeesTable.id, link.employeeId)).limit(1);
  if (!emp) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.employeeId, link.employeeId));
  
  const [plan] = await db.select().from(devPlansTable).where(eq(devPlansTable.employeeId, link.employeeId)).limit(1);
  let devPlan = null;
  if (plan) {
    const skills = await db.select().from(devPlanSkillsTable).where(eq(devPlanSkillsTable.devPlanId, plan.id));
    devPlan = {
      id: plan.id,
      employeeId: plan.employeeId,
      generatedAt: plan.generatedAt.toISOString(),
      summary: plan.summary,
      skills: skills.map(s => ({
        id: s.id,
        devPlanId: s.devPlanId,
        skillName: s.skillName,
        priority: s.priority,
        description: s.description,
        resources: s.resources,
        timeline: s.timeline,
        nextSteps: s.nextSteps,
        completed: s.completed,
        completedAt: s.completedAt?.toISOString() ?? null,
      })).sort((a, b) => a.priority - b.priority),
    };
  }

  const employee = emp.emp;
  res.json({
    employee: {
      id: employee.id,
      companyId: employee.companyId,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      level: employee.level,
      startDate: employee.startDate,
      managerId: employee.managerId,
      managerName: null,
      createdAt: employee.createdAt.toISOString(),
      latestScore: null,
    },
    reviews: reviews.map(r => ({
      id: r.id,
      employeeId: r.employeeId,
      reviewType: r.reviewType,
      reviewerId: r.reviewerId,
      reviewerName: null,
      period: r.period,
      status: r.status,
      technicalScore: r.technicalScore,
      communicationScore: r.communicationScore,
      problemSolvingScore: r.problemSolvingScore,
      teamworkScore: r.teamworkScore,
      leadershipScore: r.leadershipScore,
      overallScore: r.overallScore,
      strengths: r.strengths,
      areasToImprove: r.areasToImprove,
      goals: r.goals,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    devPlan,
    sharedAt: new Date().toISOString(),
    expiresAt: link.expiresAt?.toISOString() ?? null,
  });
});

export default router;
