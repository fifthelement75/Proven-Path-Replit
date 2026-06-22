import { Router } from "express";
import {
  db,
  selfReflectionRequestsTable,
  reviewsTable,
  notificationsTable,
  employeesTable,
  companiesTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { requireManagerOrAdmin } from "../middlewares/auth";
import { managerCanAccessEmployee } from "../lib/access";
import { sendSelfReflectionEmail, getSelfReflectionLink } from "../lib/email";

const router = Router();

const BEHAVIORAL_KEYS = new Set([
  "personalPlanning", "trackLevelPlanning", "solutionDriven", "teamLeadership",
  "persuasion", "creativeThinking", "flexibility",
  "decisionMaking", "constraintManagement",
  "verbalWritten", "focusedCommunication", "leadsGroupConversations", "interpersonal",
]);

function sanitizeBehavioral(input: unknown): Record<string, number> | null {
  if (!input || typeof input !== "object") return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!BEHAVIORAL_KEYS.has(k)) continue;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) continue;
    const clamped = Math.max(1, Math.min(5, Math.round(n)));
    out[k] = clamped;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function computeOverall(scores: (number | null | undefined)[]): number | null {
  const valid = scores.filter((s): s is number => typeof s === "number");
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
}

function clampScore(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.min(5, Math.round(n)));
}

router.get("/employees/:id/self-reflection-requests", requireManagerOrAdmin, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const employeeId = parseInt(req.params.id);
  if (isNaN(employeeId)) { res.status(400).json({ error: "Invalid employee id" }); return; }

  const empCheck = await db.select({ id: employeesTable.id }).from(employeesTable)
    .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyId, companyId))).limit(1);
  if (!empCheck.length) { res.status(404).json({ error: "Employee not found" }); return; }
  if (!(await managerCanAccessEmployee(req.auth!, employeeId))) {
    res.status(403).json({ error: "You do not have access to this employee" });
    return;
  }

  const requests = await db.select().from(selfReflectionRequestsTable)
    .where(and(eq(selfReflectionRequestsTable.employeeId, employeeId), eq(selfReflectionRequestsTable.companyId, companyId)));

  // Strip raw token from list responses to avoid token harvesting.
  res.json(requests.map(({ token: _t, ...r }) => ({
    ...r,
    expiresAt: r.expiresAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    status: r.status === "completed"
      ? "completed"
      : (r.expiresAt && r.expiresAt < new Date() ? "expired" : r.status),
  })));
});

router.post("/employees/:id/self-reflection-requests", requireManagerOrAdmin, async (req, res): Promise<void> => {
  const { companyId, userId } = req.auth!;
  const employeeId = parseInt(req.params.id);
  if (isNaN(employeeId)) { res.status(400).json({ error: "Invalid employee id" }); return; }

  const [emp] = await db.select().from(employeesTable)
    .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyId, companyId))).limit(1);
  if (!emp) { res.status(404).json({ error: "Employee not found" }); return; }
  if (!(await managerCanAccessEmployee(req.auth!, employeeId))) {
    res.status(403).json({ error: "You do not have access to this employee" });
    return;
  }

  const employeeEmail = String(req.body?.employeeEmail || emp.email || "").trim().toLowerCase();
  if (!employeeEmail) { res.status(400).json({ error: "Employee email is required" }); return; }

  const period = String(req.body?.period || `${new Date().getFullYear()} Self-reflection`).trim();
  const message = req.body?.message ? String(req.body.message).trim() : null;
  const expiresInDays = Number(req.body?.expiresInDays) || 14;
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const token = crypto.randomBytes(32).toString("hex");

  const [request] = await db.insert(selfReflectionRequestsTable).values({
    employeeId,
    companyId,
    requestedByUserId: userId,
    employeeEmail,
    period,
    message,
    token,
    status: "pending",
    expiresAt,
  }).returning();

  const [company] = await db.select({ name: companiesTable.name }).from(companiesTable)
    .where(eq(companiesTable.id, companyId)).limit(1);

  let emailSent = false;
  let emailError: string | undefined;
  try {
    await sendSelfReflectionEmail({
      employeeEmail,
      employeeName: emp.name,
      managerName: company?.name ? `${company.name} team` : null,
      message,
      reflectionLink: getSelfReflectionLink(token),
      expiresAt,
    });
    emailSent = true;
  } catch (err) {
    emailError = err instanceof Error ? err.message : String(err);
    req.log.warn({ err }, "Self-reflection email failed");
  }

  // Returning the link here is OK: the admin who just created the request needs
  // it for manual sharing (especially when email delivery fails).
  res.status(201).json({
    id: request.id,
    employeeId: request.employeeId,
    employeeEmail: request.employeeEmail,
    period: request.period,
    message: request.message,
    status: request.status,
    expiresAt: request.expiresAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString(),
    reflectionLink: getSelfReflectionLink(request.token),
    emailSent,
    emailError,
  });
});

router.delete("/employees/:id/self-reflection-requests/:requestId", requireManagerOrAdmin, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const employeeId = parseInt(req.params.id);
  const requestId = parseInt(req.params.requestId);
  if (isNaN(employeeId) || isNaN(requestId)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!(await managerCanAccessEmployee(req.auth!, employeeId))) {
    res.status(403).json({ error: "You do not have access to this employee" });
    return;
  }

  const [request] = await db.select().from(selfReflectionRequestsTable)
    .where(and(
      eq(selfReflectionRequestsTable.id, requestId),
      eq(selfReflectionRequestsTable.employeeId, employeeId),
      eq(selfReflectionRequestsTable.companyId, companyId),
    )).limit(1);
  if (!request) { res.status(404).json({ error: "Request not found" }); return; }
  if (request.status === "completed") { res.status(400).json({ error: "Cannot delete a completed request" }); return; }

  await db.delete(selfReflectionRequestsTable).where(eq(selfReflectionRequestsTable.id, requestId));
  res.json({ success: true });
});

router.post("/employees/:id/self-reflection-requests/:requestId/nudge", requireManagerOrAdmin, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const employeeId = parseInt(req.params.id);
  const requestId = parseInt(req.params.requestId);
  if (isNaN(employeeId) || isNaN(requestId)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!(await managerCanAccessEmployee(req.auth!, employeeId))) {
    res.status(403).json({ error: "You do not have access to this employee" });
    return;
  }

  const [request] = await db.select().from(selfReflectionRequestsTable)
    .where(and(
      eq(selfReflectionRequestsTable.id, requestId),
      eq(selfReflectionRequestsTable.employeeId, employeeId),
      eq(selfReflectionRequestsTable.companyId, companyId),
    )).limit(1);
  if (!request) { res.status(404).json({ error: "Request not found" }); return; }
  if (request.status === "completed") { res.status(400).json({ error: "Already completed" }); return; }

  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, employeeId)).limit(1);
  const [company] = await db.select({ name: companiesTable.name }).from(companiesTable).where(eq(companiesTable.id, companyId)).limit(1);

  try {
    await sendSelfReflectionEmail({
      employeeEmail: request.employeeEmail,
      employeeName: emp?.name ?? "",
      managerName: company?.name ? `${company.name} team` : null,
      message: request.message,
      reflectionLink: getSelfReflectionLink(request.token),
      expiresAt: request.expiresAt,
    });
    res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to send";
    res.status(500).json({ error: msg });
  }
});

// Public endpoints
router.get("/self-reflection/:token", async (req, res): Promise<void> => {
  const token = req.params.token;
  const [request] = await db.select().from(selfReflectionRequestsTable)
    .where(eq(selfReflectionRequestsTable.token, token)).limit(1);
  if (!request) { res.status(404).json({ error: "Invalid link" }); return; }
  if (request.status === "completed") { res.status(400).json({ error: "Self-reflection already submitted" }); return; }
  if (request.expiresAt && request.expiresAt < new Date()) { res.status(400).json({ error: "This link has expired" }); return; }

  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, request.employeeId)).limit(1);
  if (!emp) { res.status(404).json({ error: "Employee not found" }); return; }
  const [company] = await db.select({ name: companiesTable.name }).from(companiesTable).where(eq(companiesTable.id, request.companyId)).limit(1);

  res.json({
    requestId: request.id,
    employeeId: emp.id,
    employeeName: emp.name,
    employeeRole: emp.role,
    employeeDepartment: emp.department,
    companyName: company?.name ?? "",
    period: request.period,
    message: request.message,
    expiresAt: request.expiresAt?.toISOString() ?? null,
  });
});

router.post("/self-reflection/:token/submit", async (req, res): Promise<void> => {
  const token = req.params.token;
  const [request] = await db.select().from(selfReflectionRequestsTable)
    .where(eq(selfReflectionRequestsTable.token, token)).limit(1);
  if (!request) { res.status(404).json({ error: "Invalid link" }); return; }
  if (request.status === "completed") { res.status(400).json({ error: "Self-reflection already submitted" }); return; }
  if (request.expiresAt && request.expiresAt < new Date()) { res.status(400).json({ error: "This link has expired" }); return; }

  const b = req.body ?? {};

  const technicalScore = clampScore(b.technicalScore);
  const communicationScore = clampScore(b.communicationScore);
  const problemSolvingScore = clampScore(b.problemSolvingScore);
  const teamworkScore = clampScore(b.teamworkScore);
  const leadershipScore = clampScore(b.leadershipScore);
  const overallScore = computeOverall([technicalScore, communicationScore, problemSolvingScore, teamworkScore, leadershipScore]);

  const behavioralScores = sanitizeBehavioral(b.behavioralScores);

  // Conditionally claim the request (pending -> in_progress) to make submit
  // idempotent under concurrent submissions. Only the winning update inserts a
  // review.
  const claimed = await db.update(selfReflectionRequestsTable)
    .set({ status: "in_progress" })
    .where(and(
      eq(selfReflectionRequestsTable.id, request.id),
      eq(selfReflectionRequestsTable.status, "pending"),
    ))
    .returning({ id: selfReflectionRequestsTable.id });
  if (claimed.length === 0) {
    res.status(400).json({ error: "Self-reflection already submitted" });
    return;
  }

  const [review] = await db.insert(reviewsTable).values({
    employeeId: request.employeeId,
    reviewType: "self",
    reviewerId: null,
    period: request.period,
    status: "submitted",
    technicalScore,
    communicationScore,
    problemSolvingScore,
    teamworkScore,
    leadershipScore,
    overallScore,
    strengths: typeof b.strengths === "string" ? b.strengths : null,
    areasToImprove: typeof b.areasToImprove === "string" ? b.areasToImprove : null,
    goals: typeof b.goals === "string" ? b.goals : null,
    behavioralScores,
  }).returning();

  await db.update(selfReflectionRequestsTable)
    .set({ status: "completed", reviewId: review.id })
    .where(eq(selfReflectionRequestsTable.id, request.id));

  const [emp] = await db.select({ name: employeesTable.name }).from(employeesTable)
    .where(eq(employeesTable.id, request.employeeId)).limit(1);

  await db.insert(notificationsTable).values({
    companyId: request.companyId,
    userId: request.requestedByUserId,
    message: `Self-reflection completed by ${emp?.name ?? "an employee"}`,
    type: "self_reflection_completed",
    relatedEmployeeId: request.employeeId,
    relatedRequestId: request.id,
  });

  res.status(201).json({ success: true, reviewId: review.id });
});

export default router;
