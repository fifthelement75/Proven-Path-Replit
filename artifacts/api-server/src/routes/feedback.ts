import { Router } from "express";
import { db, feedbackTable, employeesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { CreateFeedbackBody, ListFeedbackParams, CreateFeedbackParams, RespondToFeedbackParams, RespondToFeedbackBody } from "@workspace/api-zod";
import { requireTeamPlan } from "../middlewares/requireActivePlan";

const router = Router();

function formatEntry(f: typeof feedbackTable.$inferSelect, managerName: string | null) {
  return {
    id: f.id,
    employeeId: f.employeeId,
    managerId: f.managerId,
    managerName,
    meetingType: f.meetingType,
    meetingDate: f.meetingDate,
    whatWentWell: f.whatWentWell,
    areasToImprove: f.areasToImprove,
    actionItems: f.actionItems,
    nextSteps: f.nextSteps,
    employeeResponse: f.employeeResponse,
    createdAt: f.createdAt.toISOString(),
  };
}

router.get("/employees/:employeeId/feedback", requireAuth, requireTeamPlan, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const params = ListFeedbackParams.safeParse(req.params);
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
  const entries = await db.select().from(feedbackTable).where(eq(feedbackTable.employeeId, params.data.employeeId));

  const managerIds = entries.filter(e => e.managerId != null).map(e => e.managerId!);
  const managerNames: Record<number, string> = {};
  if (managerIds.length > 0) {
    const managers = await db.select({ id: employeesTable.id, name: employeesTable.name }).from(employeesTable).where(eq(employeesTable.companyId, companyId));
    for (const m of managers) managerNames[m.id] = m.name;
  }

  res.json(entries.map(e => formatEntry(e, e.managerId ? managerNames[e.managerId] ?? null : null)));
});

router.post("/employees/:employeeId/feedback", requireAuth, requireTeamPlan, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const params = CreateFeedbackParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = CreateFeedbackBody.safeParse(req.body);
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
  const [entry] = await db.insert(feedbackTable).values({
    employeeId: params.data.employeeId,
    managerId: null,
    meetingType: body.data.meetingType,
    meetingDate: body.data.meetingDate,
    whatWentWell: body.data.whatWentWell ?? null,
    areasToImprove: body.data.areasToImprove ?? null,
    actionItems: body.data.actionItems ?? null,
    nextSteps: body.data.nextSteps ?? null,
  }).returning();
  res.status(201).json(formatEntry(entry, null));
});

router.post("/employees/:employeeId/feedback/:feedbackId/respond", requireAuth, requireTeamPlan, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const params = RespondToFeedbackParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = RespondToFeedbackBody.safeParse(req.body);
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
  const [entry] = await db.select().from(feedbackTable)
    .where(and(eq(feedbackTable.id, params.data.feedbackId), eq(feedbackTable.employeeId, params.data.employeeId))).limit(1);
  if (!entry) {
    res.status(404).json({ error: "Feedback entry not found" });
    return;
  }
  const [updated] = await db.update(feedbackTable).set({ employeeResponse: body.data.employeeResponse }).where(eq(feedbackTable.id, params.data.feedbackId)).returning();
  res.json(formatEntry(updated, null));
});

export default router;
