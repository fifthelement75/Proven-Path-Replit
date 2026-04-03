import { Router } from "express";
import { db, devPlansTable, devPlanSkillsTable, employeesTable, reviewsTable, feedbackTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { GetDevPlanParams, GenerateDevPlanParams, MarkSkillCompleteParams, MarkSkillCompleteBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger";

const router = Router();

async function getFullDevPlan(devPlanId: number) {
  const [plan] = await db.select().from(devPlansTable).where(eq(devPlansTable.id, devPlanId)).limit(1);
  if (!plan) return null;
  const skills = await db.select().from(devPlanSkillsTable).where(eq(devPlanSkillsTable.devPlanId, devPlanId));
  return {
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

router.get("/employees/:employeeId/dev-plan", requireAuth, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const params = GetDevPlanParams.safeParse(req.params);
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
  const [plan] = await db.select().from(devPlansTable).where(eq(devPlansTable.employeeId, params.data.employeeId)).limit(1);
  if (!plan) {
    res.status(404).json({ error: "No development plan found" });
    return;
  }
  const result = await getFullDevPlan(plan.id);
  res.json(result);
});

router.post("/employees/:employeeId/dev-plan/generate", requireAuth, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const params = GenerateDevPlanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { employeeId } = params.data;

  const [emp] = await db.select().from(employeesTable)
    .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyId, companyId))).limit(1);
  if (!emp) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.employeeId, employeeId));
  const feedback = await db.select().from(feedbackTable).where(eq(feedbackTable.employeeId, employeeId));

  const prompt = `You are a career development expert. Generate a personalized development plan for the following employee.

Employee: ${emp.name}
Role: ${emp.role}
Department: ${emp.department}
Level: ${emp.level}

Performance Reviews (${reviews.length} total):
${reviews.map(r => `- Type: ${r.reviewType}, Period: ${r.period}
  Scores: Technical=${r.technicalScore}/5, Communication=${r.communicationScore}/5, ProblemSolving=${r.problemSolvingScore}/5, Teamwork=${r.teamworkScore}/5, Leadership=${r.leadershipScore}/5
  Strengths: ${r.strengths || 'None noted'}
  Areas to Improve: ${r.areasToImprove || 'None noted'}
  Goals: ${r.goals || 'None noted'}`).join('\n\n')}

Feedback Log (${feedback.length} entries):
${feedback.map(f => `- ${f.meetingType} on ${f.meetingDate}: What Went Well: ${f.whatWentWell || '-'} | Areas to Improve: ${f.areasToImprove || '-'} | Action Items: ${f.actionItems || '-'}`).join('\n')}

Respond with valid JSON in exactly this format (no markdown, no code blocks):
{
  "summary": "A 2-3 sentence overview of the employee's development trajectory and key focus areas",
  "skills": [
    {
      "skillName": "Skill name",
      "priority": 1,
      "description": "Why this skill matters for this person",
      "resources": "Specific books, courses, or activities to build this skill",
      "timeline": "Realistic timeframe (e.g., 3 months)",
      "nextSteps": "Concrete first action to take this week"
    }
  ]
}

Generate 4-6 prioritized skills. Priority 1 is most important. Base it on actual gaps from the reviews and feedback.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No content from AI");

    let parsed: { summary: string; skills: Array<{ skillName: string; priority: number; description: string; resources: string; timeline: string; nextSteps: string }> };
    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse AI response");
      parsed = JSON.parse(jsonMatch[0]);
    }

    // Delete existing plan if any
    const existing = await db.select().from(devPlansTable).where(eq(devPlansTable.employeeId, employeeId)).limit(1);
    if (existing.length > 0) {
      await db.delete(devPlanSkillsTable).where(eq(devPlanSkillsTable.devPlanId, existing[0].id));
      await db.delete(devPlansTable).where(eq(devPlansTable.id, existing[0].id));
    }

    const [plan] = await db.insert(devPlansTable).values({
      employeeId,
      summary: parsed.summary,
      generatedAt: new Date(),
    }).returning();

    for (const skill of parsed.skills) {
      await db.insert(devPlanSkillsTable).values({
        devPlanId: plan.id,
        skillName: skill.skillName,
        priority: skill.priority,
        description: skill.description,
        resources: skill.resources || null,
        timeline: skill.timeline || null,
        nextSteps: skill.nextSteps || null,
        completed: false,
      });
    }

    const result = await getFullDevPlan(plan.id);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to generate dev plan");
    res.status(500).json({ error: "Failed to generate development plan" });
  }
});

router.patch("/employees/:employeeId/dev-plan/skills/:skillId/complete", requireAuth, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const params = MarkSkillCompleteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = MarkSkillCompleteBody.safeParse(req.body);
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
  const [skill] = await db.select().from(devPlanSkillsTable).where(eq(devPlanSkillsTable.id, params.data.skillId)).limit(1);
  if (!skill) {
    res.status(404).json({ error: "Skill not found" });
    return;
  }
  const [updated] = await db.update(devPlanSkillsTable).set({
    completed: body.data.completed,
    completedAt: body.data.completed ? new Date() : null,
  }).where(eq(devPlanSkillsTable.id, params.data.skillId)).returning();
  
  res.json({
    id: updated.id,
    devPlanId: updated.devPlanId,
    skillName: updated.skillName,
    priority: updated.priority,
    description: updated.description,
    resources: updated.resources,
    timeline: updated.timeline,
    nextSteps: updated.nextSteps,
    completed: updated.completed,
    completedAt: updated.completedAt?.toISOString() ?? null,
  });
});

export default router;
