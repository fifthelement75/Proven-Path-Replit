import { Router } from "express";
import { db, candidateProfilesTable, interviewAssessmentsTable, employeesTable, reviewsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { requireTeamPlan } from "../middlewares/requireActivePlan";

const router = Router();

router.get("/candidates", requireAuth, requireTeamPlan, async (req, res): Promise<void> => {
  const { companyId, role } = req.auth!;
  if (role !== "admin" && role !== "manager") { res.status(403).json({ error: "Access denied" }); return; }

  const candidates = await db.select().from(candidateProfilesTable)
    .where(eq(candidateProfilesTable.companyId, companyId))
    .orderBy(desc(candidateProfilesTable.createdAt));

  const withAssessmentCounts = await Promise.all(candidates.map(async c => {
    const assessments = await db.select({ id: interviewAssessmentsTable.id })
      .from(interviewAssessmentsTable)
      .where(eq(interviewAssessmentsTable.candidateId, c.id));
    return {
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      assessmentCount: assessments.length,
    };
  }));

  res.json(withAssessmentCounts);
});

router.post("/candidates", requireAuth, requireTeamPlan, async (req, res): Promise<void> => {
  const { companyId, role } = req.auth!;
  if (role !== "admin" && role !== "manager") { res.status(403).json({ error: "Access denied" }); return; }

  const { name, email, phone, roleApplyingFor, levelApplyingFor, resumeUrl, source, notes } = req.body;
  if (!name || !roleApplyingFor) { res.status(400).json({ error: "name and roleApplyingFor are required" }); return; }

  const [candidate] = await db.insert(candidateProfilesTable).values({
    companyId, name, email: email || null, phone: phone || null,
    roleApplyingFor, levelApplyingFor: levelApplyingFor || null,
    resumeUrl: resumeUrl || null, source: source || null,
    notes: notes || null, status: "interviewing",
  }).returning();

  res.status(201).json({ ...candidate, createdAt: candidate.createdAt.toISOString(), updatedAt: candidate.updatedAt.toISOString(), assessmentCount: 0 });
});

router.get("/candidates/:id", requireAuth, requireTeamPlan, async (req, res): Promise<void> => {
  const { companyId, role } = req.auth!;
  if (role !== "admin" && role !== "manager") { res.status(403).json({ error: "Access denied" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [candidate] = await db.select().from(candidateProfilesTable)
    .where(and(eq(candidateProfilesTable.id, id), eq(candidateProfilesTable.companyId, companyId))).limit(1);
  if (!candidate) { res.status(404).json({ error: "Candidate not found" }); return; }

  const assessments = await db.select().from(interviewAssessmentsTable)
    .where(eq(interviewAssessmentsTable.candidateId, id))
    .orderBy(desc(interviewAssessmentsTable.createdAt));

  const interviewerIds = [...new Set(assessments.map(a => a.interviewerId).filter((v): v is number => v != null))];
  const interviewerNames = new Map<number, string>();
  for (const iid of interviewerIds) {
    const [emp] = await db.select({ name: employeesTable.name }).from(employeesTable)
      .where(eq(employeesTable.id, iid)).limit(1);
    if (emp) interviewerNames.set(iid, emp.name);
  }

  res.json({
    ...candidate,
    createdAt: candidate.createdAt.toISOString(),
    updatedAt: candidate.updatedAt.toISOString(),
    assessments: assessments.map(a => ({
      ...a,
      interviewerName: a.interviewerId != null ? interviewerNames.get(a.interviewerId) ?? null : null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    })),
  });
});

router.patch("/candidates/:id", requireAuth, requireTeamPlan, async (req, res): Promise<void> => {
  const { companyId, role } = req.auth!;
  if (role !== "admin" && role !== "manager") { res.status(403).json({ error: "Access denied" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const check = await db.select({ id: candidateProfilesTable.id }).from(candidateProfilesTable)
    .where(and(eq(candidateProfilesTable.id, id), eq(candidateProfilesTable.companyId, companyId))).limit(1);
  if (!check.length) { res.status(404).json({ error: "Candidate not found" }); return; }

  const { name, email, phone, roleApplyingFor, levelApplyingFor, resumeUrl, source, status, notes } = req.body;
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;
  if (roleApplyingFor !== undefined) updateData.roleApplyingFor = roleApplyingFor;
  if (levelApplyingFor !== undefined) updateData.levelApplyingFor = levelApplyingFor;
  if (resumeUrl !== undefined) updateData.resumeUrl = resumeUrl;
  if (source !== undefined) updateData.source = source;
  if (status !== undefined) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;

  const [updated] = await db.update(candidateProfilesTable).set(updateData).where(eq(candidateProfilesTable.id, id)).returning();
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.delete("/candidates/:id", requireAuth, requireTeamPlan, async (req, res): Promise<void> => {
  const { companyId, role } = req.auth!;
  if (role !== "admin") { res.status(403).json({ error: "Admin access required" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const check = await db.select({ id: candidateProfilesTable.id }).from(candidateProfilesTable)
    .where(and(eq(candidateProfilesTable.id, id), eq(candidateProfilesTable.companyId, companyId))).limit(1);
  if (!check.length) { res.status(404).json({ error: "Candidate not found" }); return; }

  await db.delete(candidateProfilesTable).where(eq(candidateProfilesTable.id, id));
  res.sendStatus(204);
});

router.post("/candidates/:id/assessments", requireAuth, requireTeamPlan, async (req, res): Promise<void> => {
  const { companyId, userId, role } = req.auth!;
  if (role !== "admin" && role !== "manager") { res.status(403).json({ error: "Access denied" }); return; }

  const candidateId = parseInt(req.params.id);
  if (isNaN(candidateId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const check = await db.select({ id: candidateProfilesTable.id }).from(candidateProfilesTable)
    .where(and(eq(candidateProfilesTable.id, candidateId), eq(candidateProfilesTable.companyId, companyId))).limit(1);
  if (!check.length) { res.status(404).json({ error: "Candidate not found" }); return; }

  const { roleAssessed, level, interviewDate, scores, feedback, overallRecommendation, notes } = req.body;
  if (!roleAssessed || !level || !interviewDate) {
    res.status(400).json({ error: "roleAssessed, level, and interviewDate are required" }); return;
  }

  const scoresJson = scores ? JSON.stringify(scores) : null;
  const feedbackJson = feedback ? JSON.stringify(feedback) : null;

  const scoreValues: number[] = scores ? Object.values(scores).filter((v): v is number => typeof v === "number") : [];
  const avg = scoreValues.length ? (scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length).toFixed(2) : null;

  const [assessment] = await db.insert(interviewAssessmentsTable).values({
    companyId, candidateId,
    role: roleAssessed, level,
    interviewerId: userId,
    interviewDate,
    scores: scoresJson,
    feedback: feedbackJson,
    overallRecommendation: overallRecommendation || null,
    notes: notes || null,
    overallScore: avg,
  }).returning();

  res.status(201).json({ ...assessment, createdAt: assessment.createdAt.toISOString(), updatedAt: assessment.updatedAt.toISOString() });
});

router.get("/candidates/:id/assessments", requireAuth, requireTeamPlan, async (req, res): Promise<void> => {
  const { companyId, role } = req.auth!;
  if (role !== "admin" && role !== "manager") { res.status(403).json({ error: "Access denied" }); return; }

  const candidateId = parseInt(req.params.id);
  if (isNaN(candidateId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const check = await db.select({ id: candidateProfilesTable.id }).from(candidateProfilesTable)
    .where(and(eq(candidateProfilesTable.id, candidateId), eq(candidateProfilesTable.companyId, companyId))).limit(1);
  if (!check.length) { res.status(404).json({ error: "Candidate not found" }); return; }

  const assessments = await db.select().from(interviewAssessmentsTable)
    .where(eq(interviewAssessmentsTable.candidateId, candidateId))
    .orderBy(desc(interviewAssessmentsTable.createdAt));

  res.json(assessments.map(a => ({ ...a, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString() })));
});

router.post("/candidates/:id/import-to-employee", requireAuth, requireTeamPlan, async (req, res): Promise<void> => {
  const { companyId, role } = req.auth!;
  if (role !== "admin") { res.status(403).json({ error: "Admin access required" }); return; }

  const candidateId = parseInt(req.params.id);
  if (isNaN(candidateId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [candidate] = await db.select().from(candidateProfilesTable)
    .where(and(eq(candidateProfilesTable.id, candidateId), eq(candidateProfilesTable.companyId, companyId))).limit(1);
  if (!candidate) { res.status(404).json({ error: "Candidate not found" }); return; }

  const { employeeId } = req.body;
  if (!employeeId) { res.status(400).json({ error: "employeeId is required" }); return; }

  const [employee] = await db.select().from(employeesTable)
    .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyId, companyId))).limit(1);
  if (!employee) { res.status(404).json({ error: "Employee not found" }); return; }

  const assessments = await db.select().from(interviewAssessmentsTable)
    .where(eq(interviewAssessmentsTable.candidateId, candidateId))
    .orderBy(desc(interviewAssessmentsTable.createdAt));

  if (!assessments.length) {
    res.status(400).json({ error: "No assessments found to import. Add an interview assessment first." }); return;
  }

  const latestAssessment = assessments[0];
  const scores = latestAssessment.scores ? JSON.parse(latestAssessment.scores) : {};
  const feedback = latestAssessment.feedback ? JSON.parse(latestAssessment.feedback) : {};

  const allScoreValues: number[] = Object.values(scores).filter((v): v is number => typeof v === "number");
  const overallScore = allScoreValues.length
    ? parseFloat((allScoreValues.reduce((a, b) => a + b, 0) / allScoreValues.length).toFixed(2))
    : null;

  const feedbackLines = Object.entries(feedback)
    .filter(([, v]) => v)
    .map(([skill, comment]) => `${skill}: ${comment}`)
    .join("\n");

  const scoreSummary = Object.entries(scores)
    .map(([skill, score]) => `${skill}: ${score}/5`)
    .join("\n");

  const interviewDate = latestAssessment.interviewDate;
  const period = interviewDate.length >= 7 ? interviewDate.slice(0, 7) : interviewDate;

  await db.insert(reviewsTable).values({
    employeeId: employee.id,
    reviewType: "interview",
    period,
    status: "submitted",
    overallScore,
    strengths: feedbackLines || null,
    goals: `Interview Assessment imported from candidate profile.\n\nScore breakdown:\n${scoreSummary}`,
    recommendation: latestAssessment.overallRecommendation,
  });

  await db.update(candidateProfilesTable).set({ status: "hired" }).where(eq(candidateProfilesTable.id, candidateId));

  res.json({ success: true, employeeId: employee.id, overallScore });
});

export default router;
