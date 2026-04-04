import { Router } from "express";
import { db, reviewsTable, employeesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { CreateReviewBody, UpdateReviewBody, ListReviewsParams, CreateReviewParams, GetReviewParams, UpdateReviewParams } from "@workspace/api-zod";

const router = Router();

function computeOverall(scores: (number | null)[]): number | null {
  const valid = scores.filter((s): s is number => s != null);
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
}

function formatReview(r: typeof reviewsTable.$inferSelect, reviewerName: string | null = null) {
  const overall = r.overallScore ?? computeOverall([r.technicalScore, r.communicationScore, r.problemSolvingScore, r.teamworkScore, r.leadershipScore]);
  return {
    id: r.id,
    employeeId: r.employeeId,
    reviewType: r.reviewType,
    reviewerId: r.reviewerId,
    reviewerName,
    period: r.period,
    status: r.status,
    technicalScore: r.technicalScore,
    communicationScore: r.communicationScore,
    problemSolvingScore: r.problemSolvingScore,
    teamworkScore: r.teamworkScore,
    leadershipScore: r.leadershipScore,
    overallScore: overall,
    strengths: r.strengths,
    areasToImprove: r.areasToImprove,
    goals: r.goals,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

router.get("/employees/:employeeId/reviews", requireAuth, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const params = ListReviewsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { employeeId } = params.data;
  const empCheck = await db.select({ id: employeesTable.id }).from(employeesTable)
    .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyId, companyId))).limit(1);
  if (empCheck.length === 0) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.employeeId, employeeId));
  
  const reviewerIds = reviews.filter(r => r.reviewerId != null).map(r => r.reviewerId!);
  const reviewers: Record<number, string> = {};
  if (reviewerIds.length > 0) {
    const reviewerEmps = await db.select({ id: employeesTable.id, name: employeesTable.name }).from(employeesTable)
      .where(eq(employeesTable.companyId, companyId));
    for (const e of reviewerEmps) reviewers[e.id] = e.name;
  }
  
  res.json(reviews.map(r => formatReview(r, r.reviewerId ? reviewers[r.reviewerId] ?? null : null)));
});

router.post("/employees/:employeeId/reviews", requireAuth, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const params = CreateReviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = CreateReviewBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const { employeeId } = params.data;
  const empCheck = await db.select({ id: employeesTable.id }).from(employeesTable)
    .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyId, companyId))).limit(1);
  if (empCheck.length === 0) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  if (body.data.reviewerId != null) {
    const reviewerCheck = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(and(eq(employeesTable.id, body.data.reviewerId), eq(employeesTable.companyId, companyId))).limit(1);
    if (reviewerCheck.length === 0) {
      res.status(400).json({ error: "Reviewer not found in your company" });
      return;
    }
  }
  const { technicalScore, communicationScore, problemSolvingScore, teamworkScore, leadershipScore } = body.data;
  const overallScore = computeOverall([technicalScore ?? null, communicationScore ?? null, problemSolvingScore ?? null, teamworkScore ?? null, leadershipScore ?? null]);
  const [review] = await db.insert(reviewsTable).values({
    ...body.data,
    employeeId,
    overallScore,
    status: "submitted",
    reviewerId: body.data.reviewerId ?? null,
    technicalScore: body.data.technicalScore ?? null,
    communicationScore: body.data.communicationScore ?? null,
    problemSolvingScore: body.data.problemSolvingScore ?? null,
    teamworkScore: body.data.teamworkScore ?? null,
    leadershipScore: body.data.leadershipScore ?? null,
    strengths: body.data.strengths ?? null,
    areasToImprove: body.data.areasToImprove ?? null,
    goals: body.data.goals ?? null,
  }).returning();
  res.status(201).json(formatReview(review));
});

router.get("/employees/:employeeId/reviews/:reviewId", requireAuth, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const params = GetReviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { employeeId, reviewId } = params.data;
  const empCheck = await db.select({ id: employeesTable.id }).from(employeesTable)
    .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyId, companyId))).limit(1);
  if (empCheck.length === 0) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  const [review] = await db.select().from(reviewsTable)
    .where(and(eq(reviewsTable.id, reviewId), eq(reviewsTable.employeeId, employeeId))).limit(1);
  if (!review) {
    res.status(404).json({ error: "Review not found" });
    return;
  }
  res.json(formatReview(review));
});

router.patch("/employees/:employeeId/reviews/:reviewId", requireAuth, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const params = UpdateReviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateReviewBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const { employeeId, reviewId } = params.data;
  const empCheck = await db.select({ id: employeesTable.id }).from(employeesTable)
    .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyId, companyId))).limit(1);
  if (empCheck.length === 0) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  const [existing] = await db.select().from(reviewsTable)
    .where(and(eq(reviewsTable.id, reviewId), eq(reviewsTable.employeeId, employeeId))).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Review not found" });
    return;
  }
  const merged = { ...existing, ...body.data };
  const overallScore = computeOverall([merged.technicalScore, merged.communicationScore, merged.problemSolvingScore, merged.teamworkScore, merged.leadershipScore]);
  const [updated] = await db.update(reviewsTable).set({ ...body.data, overallScore }).where(eq(reviewsTable.id, reviewId)).returning();
  res.json(formatReview(updated));
});

export default router;
