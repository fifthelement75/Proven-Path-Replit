import { Router } from "express";
import { db, companiesTable, employeesTable, reviewsTable, feedbackTable } from "@workspace/db";
import { eq, avg, count, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/companies/me", requireAuth, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId)).limit(1);
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  const [{ cnt }] = await db.select({ cnt: count() }).from(employeesTable).where(eq(employeesTable.companyId, companyId));
  res.json({ id: company.id, name: company.name, email: company.email, createdAt: company.createdAt.toISOString(), employeeCount: Number(cnt) });
});

router.get("/companies/me/health", requireAuth, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;

  const employees = await db.select({ id: employeesTable.id }).from(employeesTable).where(eq(employeesTable.companyId, companyId));
  const employeeIds = employees.map(e => e.id);

  if (employeeIds.length === 0) {
    res.json({
      avgOverallScore: null, avgTechnicalScore: null, avgCommunicationScore: null,
      avgProblemSolvingScore: null, avgTeamworkScore: null, avgLeadershipScore: null,
      employeeCount: 0, reviewCount: 0, feedbackCount: 0, departmentBreakdown: [], levelBreakdown: []
    });
    return;
  }

  const [{ cnt: empCount }] = await db.select({ cnt: count() }).from(employeesTable).where(eq(employeesTable.companyId, companyId));

  const allReviews = await db.select({
    overallScore: reviewsTable.overallScore,
    technicalScore: reviewsTable.technicalScore,
    communicationScore: reviewsTable.communicationScore,
    problemSolvingScore: reviewsTable.problemSolvingScore,
    teamworkScore: reviewsTable.teamworkScore,
    leadershipScore: reviewsTable.leadershipScore,
  }).from(reviewsTable).where(sql`${reviewsTable.employeeId} = ANY(ARRAY[${sql.join(employeeIds.map(id => sql`${id}`), sql`, `)}]::integer[])`);

  const [{ cnt: fbCount }] = await db.select({ cnt: count() }).from(feedbackTable).where(sql`${feedbackTable.employeeId} = ANY(ARRAY[${sql.join(employeeIds.map(id => sql`${id}`), sql`, `)}]::integer[])`);

  const avg1 = (arr: (number | null)[]) => {
    const valid = arr.filter((v): v is number => v != null);
    return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  };

  const avgOverallScore = avg1(allReviews.map(r => r.overallScore));
  const avgTechnicalScore = avg1(allReviews.map(r => r.technicalScore));
  const avgCommunicationScore = avg1(allReviews.map(r => r.communicationScore));
  const avgProblemSolvingScore = avg1(allReviews.map(r => r.problemSolvingScore));
  const avgTeamworkScore = avg1(allReviews.map(r => r.teamworkScore));
  const avgLeadershipScore = avg1(allReviews.map(r => r.leadershipScore));

  const allEmployees = await db.select({
    department: employeesTable.department,
    level: employeesTable.level,
    id: employeesTable.id,
  }).from(employeesTable).where(eq(employeesTable.companyId, companyId));

  const deptMap: Record<string, { count: number; scores: (number | null)[] }> = {};
  for (const emp of allEmployees) {
    if (!deptMap[emp.department]) deptMap[emp.department] = { count: 0, scores: [] };
    deptMap[emp.department].count++;
  }
  const empReviews = await db.select({
    employeeId: reviewsTable.employeeId,
    overallScore: reviewsTable.overallScore,
  }).from(reviewsTable).where(sql`${reviewsTable.employeeId} = ANY(ARRAY[${sql.join(employeeIds.map(id => sql`${id}`), sql`, `)}]::integer[])`);
  
  const empDept: Record<number, string> = {};
  for (const emp of allEmployees) empDept[emp.id] = emp.department;
  for (const r of empReviews) {
    const dept = empDept[r.employeeId];
    if (dept && deptMap[dept]) deptMap[dept].scores.push(r.overallScore);
  }

  const departmentBreakdown = Object.entries(deptMap).map(([department, { count, scores }]) => ({
    department,
    count,
    avgScore: avg1(scores)
  }));

  const levelMap: Record<string, number> = {};
  for (const emp of allEmployees) {
    levelMap[emp.level] = (levelMap[emp.level] || 0) + 1;
  }
  const levelBreakdown = Object.entries(levelMap).map(([level, count]) => ({ level, count }));

  res.json({
    avgOverallScore, avgTechnicalScore, avgCommunicationScore, avgProblemSolvingScore, avgTeamworkScore, avgLeadershipScore,
    employeeCount: Number(empCount),
    reviewCount: allReviews.length,
    feedbackCount: Number(fbCount),
    departmentBreakdown,
    levelBreakdown
  });
});

router.get("/companies/me/activity", requireAuth, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;

  const employees = await db.select({ id: employeesTable.id }).from(employeesTable).where(eq(employeesTable.companyId, companyId));
  const employeeIds = employees.map(e => e.id);

  if (employeeIds.length === 0) {
    res.json([]);
    return;
  }

  const idsExpr = sql`ANY(ARRAY[${sql.join(employeeIds.map(id => sql`${id}`), sql`, `)}]::integer[])`;

  const recentReviews = await db.select({
    id: reviewsTable.id,
    employeeId: reviewsTable.employeeId,
    reviewType: reviewsTable.reviewType,
    period: reviewsTable.period,
    createdAt: reviewsTable.createdAt,
    employeeName: employeesTable.name,
  }).from(reviewsTable)
    .innerJoin(employeesTable, eq(reviewsTable.employeeId, employeesTable.id))
    .where(sql`${reviewsTable.employeeId} = ${idsExpr}`)
    .orderBy(sql`${reviewsTable.createdAt} DESC`)
    .limit(10);

  const recentFeedback = await db.select({
    id: feedbackTable.id,
    employeeId: feedbackTable.employeeId,
    meetingType: feedbackTable.meetingType,
    createdAt: feedbackTable.createdAt,
    employeeName: employeesTable.name,
  }).from(feedbackTable)
    .innerJoin(employeesTable, eq(feedbackTable.employeeId, employeesTable.id))
    .where(sql`${feedbackTable.employeeId} = ${idsExpr}`)
    .orderBy(sql`${feedbackTable.createdAt} DESC`)
    .limit(10);

  const recentEmployees = await db.select({
    id: employeesTable.id,
    name: employeesTable.name,
    createdAt: employeesTable.createdAt,
  }).from(employeesTable)
    .where(eq(employeesTable.companyId, companyId))
    .orderBy(sql`${employeesTable.createdAt} DESC`)
    .limit(5);

  const activities = [
    ...recentReviews.map(r => ({
      id: r.id * 100,
      type: "review",
      description: `${r.reviewType} review submitted for ${r.period}`,
      employeeId: r.employeeId,
      employeeName: r.employeeName,
      createdAt: r.createdAt.toISOString(),
    })),
    ...recentFeedback.map(f => ({
      id: f.id * 100 + 1,
      type: "feedback",
      description: `${f.meetingType.replace(/_/g, " ")} feedback logged`,
      employeeId: f.employeeId,
      employeeName: f.employeeName,
      createdAt: f.createdAt.toISOString(),
    })),
    ...recentEmployees.map(e => ({
      id: e.id * 100 + 2,
      type: "employee_added",
      description: `Employee joined the team`,
      employeeId: e.id,
      employeeName: e.name,
      createdAt: e.createdAt.toISOString(),
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20);

  res.json(activities);
});

export default router;
