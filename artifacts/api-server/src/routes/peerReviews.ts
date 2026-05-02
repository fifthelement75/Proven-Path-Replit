import { Router } from "express";
import { db, peerReviewRequestsTable, peerReviewsTable, notificationsTable, employeesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import crypto from "crypto";

const router = Router();

const VALID_SCORES = ["needs_improvement", "meets_expectations", "often_exceeds", "exceptional", "na"];

router.get("/employees/:id/peer-review-requests", requireAuth, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const employeeId = parseInt(req.params.id);
  if (isNaN(employeeId)) { res.status(400).json({ error: "Invalid employee id" }); return; }

  const empCheck = await db.select({ id: employeesTable.id, name: employeesTable.name })
    .from(employeesTable)
    .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyId, companyId)))
    .limit(1);
  if (!empCheck.length) { res.status(404).json({ error: "Employee not found" }); return; }

  const requests = await db.select().from(peerReviewRequestsTable)
    .where(and(eq(peerReviewRequestsTable.employeeId, employeeId), eq(peerReviewRequestsTable.companyId, companyId)));

  const reviews = await db.select({ requestId: peerReviewsTable.requestId })
    .from(peerReviewsTable)
    .where(eq(peerReviewsTable.employeeId, employeeId));

  const completedRequestIds = new Set(reviews.map(r => r.requestId));

  const result = requests.map(r => ({
    ...r,
    expiresAt: r.expiresAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    status: completedRequestIds.has(r.id) ? "completed" : (r.expiresAt && r.expiresAt < new Date() ? "expired" : r.status),
  }));

  res.json(result);
});

router.post("/employees/:id/peer-review-requests", requireAuth, async (req, res): Promise<void> => {
  const { companyId, userId } = req.auth!;
  const employeeId = parseInt(req.params.id);
  if (isNaN(employeeId)) { res.status(400).json({ error: "Invalid employee id" }); return; }

  const empCheck = await db.select({ id: employeesTable.id, name: employeesTable.name })
    .from(employeesTable)
    .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyId, companyId)))
    .limit(1);
  if (!empCheck.length) { res.status(404).json({ error: "Employee not found" }); return; }

  const { peerEmails, peerNames, expiresInDays } = req.body;
  if (!Array.isArray(peerEmails) || peerEmails.length === 0) {
    res.status(400).json({ error: "peerEmails must be a non-empty array" }); return;
  }

  const expiresAt = expiresInDays
    ? new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000)
    : null;

  const created = [];
  for (let i = 0; i < peerEmails.length; i++) {
    const peerEmail = String(peerEmails[i]).trim().toLowerCase();
    if (!peerEmail) continue;
    const token = crypto.randomBytes(32).toString("hex");
    const [req2] = await db.insert(peerReviewRequestsTable).values({
      employeeId,
      companyId,
      requestedByUserId: userId,
      peerEmail,
      peerName: peerNames?.[i] || null,
      token,
      status: "pending",
      expiresAt,
    }).returning();
    created.push({ ...req2, expiresAt: req2.expiresAt?.toISOString() ?? null, createdAt: req2.createdAt.toISOString() });
  }

  res.status(201).json(created);
});

router.get("/peer-review/:token", async (req, res): Promise<void> => {
  const { token } = req.params;
  const [request] = await db.select().from(peerReviewRequestsTable).where(eq(peerReviewRequestsTable.token, token)).limit(1);
  if (!request) { res.status(404).json({ error: "Invalid or expired review link" }); return; }

  if (request.expiresAt && request.expiresAt < new Date()) {
    res.status(410).json({ error: "This review link has expired" }); return;
  }

  const existing = await db.select({ id: peerReviewsTable.id }).from(peerReviewsTable).where(eq(peerReviewsTable.requestId, request.id)).limit(1);
  if (existing.length) { res.status(409).json({ error: "Review already submitted" }); return; }

  const [emp] = await db.select({ name: employeesTable.name, role: employeesTable.role, department: employeesTable.department })
    .from(employeesTable).where(eq(employeesTable.id, request.employeeId)).limit(1);

  res.json({
    requestId: request.id,
    employeeId: request.employeeId,
    employeeName: emp?.name ?? "Unknown",
    employeeRole: emp?.role ?? "",
    employeeDepartment: emp?.department ?? "",
    peerEmail: request.peerEmail,
    peerName: request.peerName,
    expiresAt: request.expiresAt?.toISOString() ?? null,
  });
});

router.post("/peer-review/:token/submit", async (req, res): Promise<void> => {
  const { token } = req.params;
  const [request] = await db.select().from(peerReviewRequestsTable).where(eq(peerReviewRequestsTable.token, token)).limit(1);
  if (!request) { res.status(404).json({ error: "Invalid or expired review link" }); return; }

  if (request.expiresAt && request.expiresAt < new Date()) {
    res.status(410).json({ error: "This review link has expired" }); return;
  }

  const existing = await db.select({ id: peerReviewsTable.id }).from(peerReviewsTable).where(eq(peerReviewsTable.requestId, request.id)).limit(1);
  if (existing.length) { res.status(409).json({ error: "Review already submitted" }); return; }

  const b = req.body;

  const validateScore = (v: unknown): string | null =>
    typeof v === "string" && VALID_SCORES.includes(v) ? v : null;

  const [review] = await db.insert(peerReviewsTable).values({
    requestId: request.id,
    employeeId: request.employeeId,
    companyId: request.companyId,
    peerEmail: request.peerEmail,
    personalPlanningScore: validateScore(b.personalPlanningScore),
    personalPlanningComment: b.personalPlanningComment || null,
    trackPlanningScore: validateScore(b.trackPlanningScore),
    trackPlanningComment: b.trackPlanningComment || null,
    solutionDrivenScore: validateScore(b.solutionDrivenScore),
    solutionDrivenComment: b.solutionDrivenComment || null,
    teamLeadershipScore: validateScore(b.teamLeadershipScore),
    teamLeadershipComment: b.teamLeadershipComment || null,
    persuasionScore: validateScore(b.persuasionScore),
    persuasionComment: b.persuasionComment || null,
    crossFunctionalScore: validateScore(b.crossFunctionalScore),
    crossFunctionalComment: b.crossFunctionalComment || null,
    businessAlignmentScore: validateScore(b.businessAlignmentScore),
    businessAlignmentComment: b.businessAlignmentComment || null,
    customerCentricScore: validateScore(b.customerCentricScore),
    customerCentricComment: b.customerCentricComment || null,
    dataInformedScore: validateScore(b.dataInformedScore),
    dataInformedComment: b.dataInformedComment || null,
    promotionRecommendation: ["yes", "no", "unsure"].includes(b.promotionRecommendation) ? b.promotionRecommendation : null,
    strengths: b.strengths || null,
    areasToImprove: b.areasToImprove || null,
  }).returning();

  await db.update(peerReviewRequestsTable).set({ status: "completed" }).where(eq(peerReviewRequestsTable.id, request.id));

  const completedCount = await db.select({ id: peerReviewsTable.id })
    .from(peerReviewsTable).where(eq(peerReviewsTable.employeeId, request.employeeId));
  const totalCount = await db.select({ id: peerReviewRequestsTable.id })
    .from(peerReviewRequestsTable).where(eq(peerReviewRequestsTable.employeeId, request.employeeId));

  const [emp] = await db.select({ name: employeesTable.name }).from(employeesTable).where(eq(employeesTable.id, request.employeeId)).limit(1);

  await db.insert(notificationsTable).values({
    companyId: request.companyId,
    userId: request.requestedByUserId,
    message: `Peer review completed for ${emp?.name ?? "an employee"} by ${request.peerEmail} (${completedCount.length} of ${totalCount.length} completed)`,
    type: "peer_review_completed",
    relatedEmployeeId: request.employeeId,
    relatedRequestId: request.id,
  });

  res.status(201).json({ success: true, reviewId: review.id });
});

router.get("/employees/:id/peer-reviews", requireAuth, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const employeeId = parseInt(req.params.id);
  if (isNaN(employeeId)) { res.status(400).json({ error: "Invalid employee id" }); return; }

  const empCheck = await db.select({ id: employeesTable.id }).from(employeesTable)
    .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyId, companyId))).limit(1);
  if (!empCheck.length) { res.status(404).json({ error: "Employee not found" }); return; }

  const reviews = await db.select().from(peerReviewsTable).where(eq(peerReviewsTable.employeeId, employeeId));
  res.json(reviews.map(r => ({ ...r, submittedAt: r.submittedAt.toISOString(), createdAt: r.createdAt.toISOString() })));
});

export default router;
