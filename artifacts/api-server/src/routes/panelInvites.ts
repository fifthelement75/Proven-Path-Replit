import { Router } from "express";
import {
  db,
  candidateProfilesTable,
  interviewAssessmentsTable,
  panelInvitesTable,
  employeesTable,
  companiesTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";
import { requireAuth } from "../middlewares/auth";
import { requireActivePlan } from "../middlewares/requireActivePlan";
import { sendPanelInviteEmail, getPanelAssessmentLink } from "../lib/email";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger";

const router = Router();

const PANEL_INVITE_EXPIRY_DAYS = 7;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// Authenticated: create panel invites (admin/manager)
// ---------------------------------------------------------------------------
router.post("/candidates/:id/panel-invites", requireAuth, requireActivePlan, async (req, res): Promise<void> => {
  const { companyId, userId, role } = req.auth!;
  if (role !== "admin" && role !== "manager") { res.status(403).json({ error: "Access denied" }); return; }

  const candidateId = parseInt(String(req.params.id));
  if (isNaN(candidateId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [candidate] = await db.select().from(candidateProfilesTable)
    .where(and(eq(candidateProfilesTable.id, candidateId), eq(candidateProfilesTable.companyId, companyId))).limit(1);
  if (!candidate) { res.status(404).json({ error: "Candidate not found" }); return; }

  const { roleAssessed, level, interviewDate, emails, roleLabel } = req.body;
  if (!roleAssessed || !level || !interviewDate) {
    res.status(400).json({ error: "roleAssessed, level, and interviewDate are required" }); return;
  }
  if (!Array.isArray(emails) || emails.length === 0) {
    res.status(400).json({ error: "emails must be a non-empty array" }); return;
  }

  const cleaned = [...new Set(
    emails.map((e: unknown) => String(e).trim().toLowerCase()).filter(e => e.length > 0)
  )];
  if (cleaned.length > 20) {
    res.status(400).json({ error: "You can invite at most 20 panelists at a time" }); return;
  }
  const invalid = cleaned.filter(e => !EMAIL_RE.test(e));
  if (invalid.length) {
    res.status(400).json({ error: `Invalid email address${invalid.length > 1 ? "es" : ""}: ${invalid.join(", ")}` }); return;
  }

  let inviterName: string | null = null;
  const [inviter] = await db.select({ name: employeesTable.name }).from(employeesTable)
    .where(and(eq(employeesTable.id, userId), eq(employeesTable.companyId, companyId))).limit(1);
  if (inviter) inviterName = inviter.name;
  if (!inviterName) {
    const [company] = await db.select({ name: companiesTable.name }).from(companiesTable)
      .where(eq(companiesTable.id, companyId)).limit(1);
    inviterName = company?.name ?? null;
  }

  const expiresAt = new Date(Date.now() + PANEL_INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const created: Array<Record<string, unknown>> = [];

  for (const email of cleaned) {
    const token = crypto.randomBytes(32).toString("hex");
    const [invite] = await db.insert(panelInvitesTable).values({
      companyId,
      candidateId,
      invitedByUserId: userId,
      email,
      role: roleAssessed,
      level,
      interviewDate,
      token,
      status: "pending",
      expiresAt,
    }).returning();

    let emailSent = false;
    let emailError: string | undefined;
    try {
      await sendPanelInviteEmail({
        toEmail: email,
        candidateName: candidate.name,
        roleLabel: roleLabel || roleAssessed,
        interviewDate,
        inviterName,
        assessmentLink: getPanelAssessmentLink(token),
        expiresAt,
      });
      emailSent = true;
    } catch (err) {
      emailError = err instanceof Error ? err.message : String(err);
      logger.error({ err, email }, "Failed to send panel invite email");
    }

    created.push({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      level: invite.level,
      interviewDate: invite.interviewDate,
      status: invite.status,
      expiresAt: invite.expiresAt?.toISOString() ?? null,
      createdAt: invite.createdAt.toISOString(),
      emailSent,
      ...(emailError ? { emailError } : {}),
    });
  }

  res.status(201).json(created);
});

// ---------------------------------------------------------------------------
// Authenticated: list panel invites for a candidate
// ---------------------------------------------------------------------------
router.get("/candidates/:id/panel-invites", requireAuth, async (req, res): Promise<void> => {
  const { companyId, role } = req.auth!;
  if (role !== "admin" && role !== "manager") { res.status(403).json({ error: "Access denied" }); return; }

  const candidateId = parseInt(String(req.params.id));
  if (isNaN(candidateId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const check = await db.select({ id: candidateProfilesTable.id }).from(candidateProfilesTable)
    .where(and(eq(candidateProfilesTable.id, candidateId), eq(candidateProfilesTable.companyId, companyId))).limit(1);
  if (!check.length) { res.status(404).json({ error: "Candidate not found" }); return; }

  const invites = await db.select().from(panelInvitesTable)
    .where(and(eq(panelInvitesTable.candidateId, candidateId), eq(panelInvitesTable.companyId, companyId)))
    .orderBy(desc(panelInvitesTable.createdAt));

  res.json(invites.map(i => ({
    id: i.id,
    email: i.email,
    role: i.role,
    level: i.level,
    interviewDate: i.interviewDate,
    status: i.status === "pending" && i.expiresAt && i.expiresAt < new Date() ? "expired" : i.status,
    expiresAt: i.expiresAt?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
  })));
});

// ---------------------------------------------------------------------------
// Authenticated: delete a pending invite
// ---------------------------------------------------------------------------
router.delete("/candidates/:id/panel-invites/:inviteId", requireAuth, async (req, res): Promise<void> => {
  const { companyId, role } = req.auth!;
  if (role !== "admin" && role !== "manager") { res.status(403).json({ error: "Access denied" }); return; }

  const candidateId = parseInt(String(req.params.id));
  const inviteId = parseInt(String(req.params.inviteId));
  if (isNaN(candidateId) || isNaN(inviteId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [invite] = await db.select().from(panelInvitesTable)
    .where(and(
      eq(panelInvitesTable.id, inviteId),
      eq(panelInvitesTable.candidateId, candidateId),
      eq(panelInvitesTable.companyId, companyId),
    )).limit(1);
  if (!invite) { res.status(404).json({ error: "Invite not found" }); return; }
  if (invite.status === "completed") {
    res.status(409).json({ error: "Cannot delete an invite that has already been completed" }); return;
  }

  await db.delete(panelInvitesTable).where(eq(panelInvitesTable.id, inviteId));
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Public: fetch invite info by token (no auth)
// ---------------------------------------------------------------------------
router.get("/panel-assessment/:token", async (req, res): Promise<void> => {
  const token = String(req.params.token);
  const [invite] = await db.select().from(panelInvitesTable).where(eq(panelInvitesTable.token, token)).limit(1);
  if (!invite) { res.status(404).json({ error: "Invalid or expired assessment link" }); return; }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    res.status(410).json({ error: "This assessment link has expired" }); return;
  }
  if (invite.status === "completed") {
    res.status(409).json({ error: "This assessment has already been submitted" }); return;
  }

  const [candidate] = await db.select({ name: candidateProfilesTable.name })
    .from(candidateProfilesTable).where(eq(candidateProfilesTable.id, invite.candidateId)).limit(1);

  res.json({
    candidateName: candidate?.name ?? "Unknown",
    role: invite.role,
    level: invite.level,
    interviewDate: invite.interviewDate,
    panelistEmail: invite.email,
    expiresAt: invite.expiresAt?.toISOString() ?? null,
  });
});

// ---------------------------------------------------------------------------
// Public: submit assessment by token (no auth)
// ---------------------------------------------------------------------------
router.post("/panel-assessment/:token/submit", async (req, res): Promise<void> => {
  const token = String(req.params.token);
  const [invite] = await db.select().from(panelInvitesTable).where(eq(panelInvitesTable.token, token)).limit(1);
  if (!invite) { res.status(404).json({ error: "Invalid or expired assessment link" }); return; }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    res.status(410).json({ error: "This assessment link has expired" }); return;
  }
  if (invite.status === "completed") {
    res.status(409).json({ error: "This assessment has already been submitted" }); return;
  }

  const { scores, feedback, overallRecommendation, notes } = req.body;

  const cleanScores: Record<string, number> = {};
  if (scores && typeof scores === "object") {
    for (const [k, v] of Object.entries(scores as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5 && k.length <= 200) cleanScores[k] = v;
      if (Object.keys(cleanScores).length >= 100) break;
    }
  }
  if (Object.keys(cleanScores).length === 0) {
    res.status(400).json({ error: "Score at least one skill" }); return;
  }

  const cleanFeedback: Record<string, string> = {};
  if (feedback && typeof feedback === "object") {
    for (const [k, v] of Object.entries(feedback as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim() && k in cleanScores) cleanFeedback[k] = v.trim().slice(0, 2000);
    }
  }

  const VALID_RECOMMENDATIONS = ["strong_yes", "yes", "maybe", "no"];
  const cleanRecommendation =
    typeof overallRecommendation === "string" && VALID_RECOMMENDATIONS.includes(overallRecommendation)
      ? overallRecommendation
      : null;
  const cleanNotes = typeof notes === "string" && notes.trim() ? notes.trim().slice(0, 5000) : null;

  const scoreValues = Object.values(cleanScores);
  const avg = (scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length).toFixed(2);

  // Atomically claim the invite so a token can only ever produce one assessment,
  // even under concurrent submissions.
  const claimed = await db.update(panelInvitesTable)
    .set({ status: "completed" })
    .where(and(eq(panelInvitesTable.id, invite.id), eq(panelInvitesTable.status, "pending")))
    .returning({ id: panelInvitesTable.id });
  if (claimed.length === 0) {
    res.status(409).json({ error: "This assessment has already been submitted" }); return;
  }

  const [assessment] = await db.insert(interviewAssessmentsTable).values({
    companyId: invite.companyId,
    candidateId: invite.candidateId,
    role: invite.role,
    level: invite.level,
    interviewerId: null,
    panelInviteId: invite.id,
    panelistEmail: invite.email,
    interviewDate: invite.interviewDate,
    scores: JSON.stringify(cleanScores),
    feedback: Object.keys(cleanFeedback).length ? JSON.stringify(cleanFeedback) : null,
    overallRecommendation: cleanRecommendation,
    notes: cleanNotes,
    overallScore: avg,
  }).returning();

  // Stale summary: the AI analysis no longer reflects all responses.
  await db.update(candidateProfilesTable)
    .set({ panelAiSummary: null, panelAiSummaryAt: null })
    .where(eq(candidateProfilesTable.id, invite.candidateId));

  const [candidate] = await db.select({ name: candidateProfilesTable.name })
    .from(candidateProfilesTable).where(eq(candidateProfilesTable.id, invite.candidateId)).limit(1);

  await db.insert(notificationsTable).values({
    companyId: invite.companyId,
    userId: invite.invitedByUserId,
    message: `Panel assessment completed for candidate ${candidate?.name ?? "Unknown"} by ${invite.email}`,
    type: "panel_assessment_completed",
  });

  res.status(201).json({ success: true, assessmentId: assessment.id });
});

// ---------------------------------------------------------------------------
// Authenticated: get / generate the AI panel summary
// ---------------------------------------------------------------------------
router.get("/candidates/:id/panel-summary", requireAuth, async (req, res): Promise<void> => {
  const { companyId, role } = req.auth!;
  if (role !== "admin" && role !== "manager") { res.status(403).json({ error: "Access denied" }); return; }

  const candidateId = parseInt(String(req.params.id));
  if (isNaN(candidateId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [candidate] = await db.select().from(candidateProfilesTable)
    .where(and(eq(candidateProfilesTable.id, candidateId), eq(candidateProfilesTable.companyId, companyId))).limit(1);
  if (!candidate) { res.status(404).json({ error: "Candidate not found" }); return; }

  let storedSummary: unknown = null;
  if (candidate.panelAiSummary) {
    try { storedSummary = JSON.parse(candidate.panelAiSummary); } catch { storedSummary = null; }
  }
  res.json({
    summary: storedSummary,
    generatedAt: candidate.panelAiSummaryAt?.toISOString() ?? null,
  });
});

router.post("/candidates/:id/panel-summary/generate", requireAuth, requireActivePlan, async (req, res): Promise<void> => {
  const { companyId, role } = req.auth!;
  if (role !== "admin" && role !== "manager") { res.status(403).json({ error: "Access denied" }); return; }

  const candidateId = parseInt(String(req.params.id));
  if (isNaN(candidateId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [candidate] = await db.select().from(candidateProfilesTable)
    .where(and(eq(candidateProfilesTable.id, candidateId), eq(candidateProfilesTable.companyId, companyId))).limit(1);
  if (!candidate) { res.status(404).json({ error: "Candidate not found" }); return; }

  const assessments = await db.select().from(interviewAssessmentsTable)
    .where(eq(interviewAssessmentsTable.candidateId, candidateId))
    .orderBy(desc(interviewAssessmentsTable.createdAt));

  if (assessments.length < 2) {
    res.status(400).json({ error: "At least two assessments are required to generate a panel summary" }); return;
  }

  const safeParse = (s: string | null): Record<string, never> => {
    if (!s) return {};
    try { return JSON.parse(s); } catch { return {}; }
  };
  const assessmentBlocks = assessments.map((a, i) => {
    const scores: Record<string, number> = safeParse(a.scores);
    const feedback: Record<string, string> = safeParse(a.feedback);
    const scoreLines = Object.entries(scores).map(([skill, s]) =>
      `  - ${skill}: ${s}/5${feedback[skill] ? ` — "${feedback[skill]}"` : ""}`).join("\n");
    const who = a.panelistEmail ? `Panelist (${a.panelistEmail})` : "Internal interviewer";
    return `Assessment ${i + 1} — ${who}, interviewed ${a.interviewDate}:
Recommendation: ${a.overallRecommendation || "not given"}
Average score: ${a.overallScore ?? "n/a"}/5
Skill scores:
${scoreLines || "  (none)"}
Notes: ${a.notes || "(none)"}`;
  }).join("\n\n");

  const prompt = `You are an experienced hiring committee facilitator. Below are ${assessments.length} interview assessments for candidate "${candidate.name}" applying for the role "${candidate.roleApplyingFor}".

${assessmentBlocks}

Synthesize the panel's collective input. Respond with ONLY a JSON object (no markdown fences) with exactly these keys:
{
  "consensus": "2-3 sentences on where the panel clearly agrees (strengths and/or concerns)",
  "disagreements": "1-3 sentences on where panelists diverge, naming the specific skills or themes; if there is no meaningful disagreement, say so",
  "overallRead": "2-3 sentences giving a balanced overall read of the candidate based on all notes and scores",
  "suggestedRecommendation": "one of: strong_yes, yes, maybe, no",
  "keyThemes": ["3-5 short phrases capturing recurring themes from the notes"]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI response did not contain valid JSON");
      parsed = JSON.parse(match[0]);
    }

    const now = new Date();
    await db.update(candidateProfilesTable)
      .set({ panelAiSummary: JSON.stringify(parsed), panelAiSummaryAt: now })
      .where(eq(candidateProfilesTable.id, candidateId));

    res.json({ summary: parsed, generatedAt: now.toISOString() });
  } catch (err) {
    logger.error({ err, candidateId }, "Failed to generate panel summary");
    res.status(502).json({ error: "Failed to generate the AI panel summary. Please try again." });
  }
});

export default router;
