import { Router } from "express";
import { db, peerReviewRequestsTable, peerReviewsTable, notificationsTable, employeesTable } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { canAccessEmployee, managerCanAccessEmployee } from "../lib/access";
import { requireActivePlan } from "../middlewares/requireActivePlan";
import crypto from "crypto";
import { sendPeerReviewEmail, getPeerReviewLink } from "../lib/email";
import { logger } from "../lib/logger";

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
  if (!(await canAccessEmployee(req.auth!, employeeId))) {
    res.status(403).json({ error: "You do not have access to this employee" });
    return;
  }

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

router.post("/employees/:id/peer-review-requests", requireAuth, requireActivePlan, async (req, res): Promise<void> => {
  const { companyId, userId } = req.auth!;
  const employeeId = parseInt(req.params.id);
  if (isNaN(employeeId)) { res.status(400).json({ error: "Invalid employee id" }); return; }

  const empCheck = await db.select({ id: employeesTable.id, name: employeesTable.name })
    .from(employeesTable)
    .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyId, companyId)))
    .limit(1);
  if (!empCheck.length) { res.status(404).json({ error: "Employee not found" }); return; }
  if (!(await managerCanAccessEmployee(req.auth!, employeeId))) {
    res.status(403).json({ error: "Only admins and managers can request peer reviews" });
    return;
  }

  const { peerEmails, peerNames, expiresInDays } = req.body;
  if (!Array.isArray(peerEmails) || peerEmails.length === 0) {
    res.status(400).json({ error: "peerEmails must be a non-empty array" }); return;
  }

  const expiresAt = expiresInDays
    ? new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000)
    : null;

  interface PeerReviewRequestResponse {
    id: number;
    employeeId: number;
    companyId: number;
    requestedByUserId: string;
    peerEmail: string;
    peerName: string | null;
    token: string;
    status: string;
    expiresAt: string | null;
    createdAt: string;
    emailSent: boolean;
    emailError?: string;
  }

  const created: PeerReviewRequestResponse[] = [];

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

    let emailSent = false;
    let emailError: string | undefined;
    try {
      const reviewLink = getPeerReviewLink(token);
      await sendPeerReviewEmail({
        peerEmail,
        peerName: peerNames?.[i] || null,
        employeeName: empCheck[0].name,
        reviewLink,
        expiresAt,
      });
      emailSent = true;
    } catch (err) {
      emailError = err instanceof Error ? err.message : String(err);
      logger.error({ err, peerEmail }, "Failed to send peer review email");
    }

    const entry: PeerReviewRequestResponse = {
      id: req2.id,
      employeeId: req2.employeeId,
      companyId: req2.companyId,
      requestedByUserId: req2.requestedByUserId,
      peerEmail: req2.peerEmail,
      peerName: req2.peerName,
      token: req2.token,
      status: req2.status,
      expiresAt: req2.expiresAt?.toISOString() ?? null,
      createdAt: req2.createdAt.toISOString(),
      emailSent,
    };
    if (emailError) entry.emailError = emailError;
    created.push(entry);
  }

  res.status(201).json(created);
});

router.delete("/employees/:id/peer-review-requests/:requestId", requireAuth, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const employeeId = parseInt(req.params.id);
  const requestId = parseInt(req.params.requestId);
  if (isNaN(employeeId) || isNaN(requestId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [request] = await db.select().from(peerReviewRequestsTable)
    .where(and(
      eq(peerReviewRequestsTable.id, requestId),
      eq(peerReviewRequestsTable.employeeId, employeeId),
      eq(peerReviewRequestsTable.companyId, companyId),
    ))
    .limit(1);
  if (!request) { res.status(404).json({ error: "Request not found" }); return; }
  if (!(await managerCanAccessEmployee(req.auth!, employeeId))) {
    res.status(403).json({ error: "Only admins and managers can manage peer review requests" });
    return;
  }

  const existing = await db.select({ id: peerReviewsTable.id })
    .from(peerReviewsTable)
    .where(eq(peerReviewsTable.requestId, requestId))
    .limit(1);
  if (existing.length) {
    res.status(409).json({ error: "Cannot delete a request that has already been completed" });
    return;
  }

  await db.delete(peerReviewRequestsTable).where(eq(peerReviewRequestsTable.id, requestId));
  res.json({ success: true });
});

router.post("/employees/:id/peer-review-requests/:requestId/nudge", requireAuth, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const employeeId = parseInt(req.params.id);
  const requestId = parseInt(req.params.requestId);
  if (isNaN(employeeId) || isNaN(requestId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [request] = await db.select().from(peerReviewRequestsTable)
    .where(and(
      eq(peerReviewRequestsTable.id, requestId),
      eq(peerReviewRequestsTable.employeeId, employeeId),
      eq(peerReviewRequestsTable.companyId, companyId),
    ))
    .limit(1);
  if (!request) { res.status(404).json({ error: "Request not found" }); return; }
  if (!(await managerCanAccessEmployee(req.auth!, employeeId))) {
    res.status(403).json({ error: "Only admins and managers can manage peer review requests" });
    return;
  }

  if (request.expiresAt && request.expiresAt < new Date()) {
    res.status(410).json({ error: "This request has expired — peers can no longer respond" });
    return;
  }

  const existing = await db.select({ id: peerReviewsTable.id })
    .from(peerReviewsTable)
    .where(eq(peerReviewsTable.requestId, requestId))
    .limit(1);
  if (existing.length) {
    res.status(409).json({ error: "This peer has already submitted their review" });
    return;
  }

  const [emp] = await db.select({ name: employeesTable.name })
    .from(employeesTable).where(eq(employeesTable.id, employeeId)).limit(1);

  try {
    const reviewLink = getPeerReviewLink(request.token);
    await sendPeerReviewEmail({
      peerEmail: request.peerEmail,
      peerName: request.peerName,
      employeeName: emp?.name ?? "your colleague",
      reviewLink,
      expiresAt: request.expiresAt,
    });
    res.json({ success: true, emailSent: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err, peerEmail: request.peerEmail }, "Failed to send peer review nudge");
    res.status(502).json({ error: msg, emailSent: false });
  }
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

// Test-only hook, invoked inside the submit transaction after the claim.
// Lets tests deterministically force a post-claim failure and verify rollback.
let afterClaimHook: ((requestId: number) => Promise<void>) | undefined;
export function __setAfterClaimHookForTests(hook: typeof afterClaimHook): void {
  afterClaimHook = hook;
}

router.post("/peer-review/:token/submit", async (req, res): Promise<void> => {
  const { token } = req.params;
  const [request] = await db.select().from(peerReviewRequestsTable).where(eq(peerReviewRequestsTable.token, token)).limit(1);
  if (!request) { res.status(404).json({ error: "Invalid or expired review link" }); return; }

  if (request.expiresAt && request.expiresAt < new Date()) {
    res.status(410).json({ error: "This review link has expired" }); return;
  }

  const b = req.body;

  const validateScore = (v: unknown): string | null =>
    typeof v === "string" && VALID_SCORES.includes(v) ? v : null;

  // Claim + review insert run in one transaction: the conditional status update
  // acts as the lock (only the first concurrent submit wins), and any failure
  // after the claim rolls it back so the token stays retryable.
  let review: typeof peerReviewsTable.$inferSelect | undefined;
  const claimedOk = await db.transaction(async (tx) => {
    const [claimed] = await tx.update(peerReviewRequestsTable)
      .set({ status: "completed" })
      .where(and(
        eq(peerReviewRequestsTable.id, request.id),
        ne(peerReviewRequestsTable.status, "completed"),
      ))
      .returning({ id: peerReviewRequestsTable.id });
    if (!claimed) return false;

    if (afterClaimHook) await afterClaimHook(request.id);

    [review] = await tx.insert(peerReviewsTable).values({
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
    return true;
  });
  if (!claimedOk) { res.status(409).json({ error: "Review already submitted" }); return; }

  // Notification is best-effort after the durable review: a failure here must
  // not undo the submission or make the token look retryable.
  try {
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
  } catch (err) {
    console.error("Failed to create peer-review notification", err);
  }

  res.status(201).json({ success: true, reviewId: review!.id });
});

router.get("/employees/:id/peer-reviews", requireAuth, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const employeeId = parseInt(req.params.id);
  if (isNaN(employeeId)) { res.status(400).json({ error: "Invalid employee id" }); return; }

  const empCheck = await db.select({ id: employeesTable.id }).from(employeesTable)
    .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyId, companyId))).limit(1);
  if (!empCheck.length) { res.status(404).json({ error: "Employee not found" }); return; }
  if (!(await canAccessEmployee(req.auth!, employeeId))) {
    res.status(403).json({ error: "You do not have access to this employee" });
    return;
  }

  const reviews = await db.select().from(peerReviewsTable).where(eq(peerReviewsTable.employeeId, employeeId));
  res.json(reviews.map(r => ({ ...r, submittedAt: r.submittedAt.toISOString(), createdAt: r.createdAt.toISOString() })));
});

export default router;
