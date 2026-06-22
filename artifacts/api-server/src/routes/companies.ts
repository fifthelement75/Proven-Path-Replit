import { Router } from "express";
import { db, companiesTable, employeesTable, reviewsTable, feedbackTable, devPlansTable, devPlanSkillsTable, peerReviewsTable } from "@workspace/db";
import { eq, count, sql, inArray } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

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

router.get("/companies/me/employee-summaries", requireAuth, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;

  const employees = await db.select({
    id: employeesTable.id,
    name: employeesTable.name,
    role: employeesTable.role,
    department: employeesTable.department,
    createdAt: employeesTable.createdAt,
  }).from(employeesTable).where(eq(employeesTable.companyId, companyId));

  if (employees.length === 0) {
    res.json([]);
    return;
  }

  const employeeIds = employees.map(e => e.id);
  const idsExpr = sql`ANY(ARRAY[${sql.join(employeeIds.map(id => sql`${id}`), sql`, `)}]::integer[])`;

  const allReviews = await db.select({
    id: reviewsTable.id,
    employeeId: reviewsTable.employeeId,
    reviewType: reviewsTable.reviewType,
    period: reviewsTable.period,
    overallScore: reviewsTable.overallScore,
    createdAt: reviewsTable.createdAt,
  }).from(reviewsTable)
    .where(sql`${reviewsTable.employeeId} = ${idsExpr}`)
    .orderBy(sql`${reviewsTable.createdAt} DESC`);

  const allFeedback = await db.select({
    id: feedbackTable.id,
    employeeId: feedbackTable.employeeId,
    meetingType: feedbackTable.meetingType,
    meetingDate: feedbackTable.meetingDate,
    createdAt: feedbackTable.createdAt,
  }).from(feedbackTable)
    .where(sql`${feedbackTable.employeeId} = ${idsExpr}`)
    .orderBy(sql`${feedbackTable.createdAt} DESC`);

  const allDevPlans = await db.select({
    id: devPlansTable.id,
    employeeId: devPlansTable.employeeId,
    generatedAt: devPlansTable.generatedAt,
  }).from(devPlansTable)
    .where(sql`${devPlansTable.employeeId} = ${idsExpr}`);

  const devPlanIds = allDevPlans.map(p => p.id);
  let allSkills: { devPlanId: number; completed: boolean }[] = [];
  if (devPlanIds.length > 0) {
    allSkills = await db.select({
      devPlanId: devPlanSkillsTable.devPlanId,
      completed: devPlanSkillsTable.completed,
    }).from(devPlanSkillsTable)
      .where(sql`${devPlanSkillsTable.devPlanId} = ANY(ARRAY[${sql.join(devPlanIds.map(id => sql`${id}`), sql`, `)}]::integer[])`);
  }

  const reviewsByEmp: Record<number, typeof allReviews> = {};
  for (const r of allReviews) {
    if (!reviewsByEmp[r.employeeId]) reviewsByEmp[r.employeeId] = [];
    reviewsByEmp[r.employeeId].push(r);
  }

  const feedbackByEmp: Record<number, typeof allFeedback> = {};
  for (const f of allFeedback) {
    if (!feedbackByEmp[f.employeeId]) feedbackByEmp[f.employeeId] = [];
    feedbackByEmp[f.employeeId].push(f);
  }

  const devPlanByEmp: Record<number, { id: number; generatedAt: Date; skillsTotal: number; skillsCompleted: number }> = {};
  for (const p of allDevPlans) {
    const skills = allSkills.filter(s => s.devPlanId === p.id);
    devPlanByEmp[p.employeeId] = {
      id: p.id,
      generatedAt: p.generatedAt,
      skillsTotal: skills.length,
      skillsCompleted: skills.filter(s => s.completed).length,
    };
  }

  const MEETING_TYPE_LABELS: Record<string, string> = {
    one_on_one: "1:1 Meeting",
    performance_check_in: "Performance Check-in",
    project_debrief: "Project Debrief",
    career_conversation: "Career Conversation",
    other: "Other",
  };

  const summaries = employees.map(emp => {
    const reviews = reviewsByEmp[emp.id] ?? [];
    const feedback = feedbackByEmp[emp.id] ?? [];
    const devPlan = devPlanByEmp[emp.id] ?? null;

    const lastReview = reviews[0] ?? null;
    const lastFeedback = feedback[0] ?? null;

    const lastActivityAt = [
      lastReview?.createdAt,
      lastFeedback?.createdAt,
      devPlan?.generatedAt,
      emp.createdAt,
    ].filter(Boolean).map(d => new Date(d!).getTime()).sort((a, b) => b - a)[0];

    return {
      employeeId: emp.id,
      name: emp.name,
      role: emp.role,
      department: emp.department,
      reviewCount: reviews.length,
      lastReviewType: lastReview ? lastReview.reviewType : null,
      lastReviewPeriod: lastReview ? lastReview.period : null,
      lastReviewScore: lastReview ? lastReview.overallScore : null,
      lastReviewDate: lastReview ? lastReview.createdAt.toISOString() : null,
      feedbackCount: feedback.length,
      lastFeedbackType: lastFeedback ? MEETING_TYPE_LABELS[lastFeedback.meetingType] ?? lastFeedback.meetingType : null,
      lastFeedbackDate: lastFeedback ? lastFeedback.meetingDate : null,
      hasDevPlan: !!devPlan,
      devPlanSkillsTotal: devPlan?.skillsTotal ?? 0,
      devPlanSkillsCompleted: devPlan?.skillsCompleted ?? 0,
      devPlanGeneratedAt: devPlan?.generatedAt.toISOString() ?? null,
      lastActivityAt: new Date(lastActivityAt).toISOString(),
    };
  }).sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());

  res.json(summaries);
});

function csvEsc(val: unknown): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(cols: unknown[]): string {
  return cols.map(csvEsc).join(",");
}

function sectionHeader(title: string): string {
  return `\n${title}\n`;
}

router.get("/companies/me/export", requireAdmin, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;

  const employees = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.companyId, companyId))
    .orderBy(employeesTable.name);

  const employeeIds = employees.map(e => e.id);

  const managerMap: Record<number, string> = {};
  for (const e of employees) managerMap[e.id] = e.name;

  let reviews: (typeof reviewsTable.$inferSelect & { employeeName: string })[] = [];
  let feedback: (typeof feedbackTable.$inferSelect & { employeeName: string })[] = [];
  let peerReviews: (typeof peerReviewsTable.$inferSelect & { employeeName: string })[] = [];

  if (employeeIds.length > 0) {
    const rawReviews = await db
      .select({ r: reviewsTable, employeeName: employeesTable.name })
      .from(reviewsTable)
      .innerJoin(employeesTable, eq(reviewsTable.employeeId, employeesTable.id))
      .where(inArray(reviewsTable.employeeId, employeeIds))
      .orderBy(reviewsTable.createdAt);
    reviews = rawReviews.map(row => ({ ...row.r, employeeName: row.employeeName }));

    const rawFeedback = await db
      .select({ f: feedbackTable, employeeName: employeesTable.name })
      .from(feedbackTable)
      .innerJoin(employeesTable, eq(feedbackTable.employeeId, employeesTable.id))
      .where(inArray(feedbackTable.employeeId, employeeIds))
      .orderBy(feedbackTable.createdAt);
    feedback = rawFeedback.map(row => ({ ...row.f, employeeName: row.employeeName }));

    const rawPeer = await db
      .select({ p: peerReviewsTable, employeeName: employeesTable.name })
      .from(peerReviewsTable)
      .innerJoin(employeesTable, eq(peerReviewsTable.employeeId, employeesTable.id))
      .where(inArray(peerReviewsTable.employeeId, employeeIds))
      .orderBy(peerReviewsTable.submittedAt);
    peerReviews = rawPeer.map(row => ({ ...row.p, employeeName: row.employeeName }));
  }

  const lines: string[] = [];

  lines.push(sectionHeader("EMPLOYEES"));
  lines.push(csvRow(["Employee ID", "Name", "Email", "Job Title", "Department", "Level", "Access Role", "Manager", "Start Date", "Added Date"]));
  for (const e of employees) {
    lines.push(csvRow([
      e.id, e.name, e.email, e.role, e.department, e.level,
      e.userRole, e.managerId ? (managerMap[e.managerId] ?? e.managerId) : "",
      e.startDate, e.createdAt.toISOString(),
    ]));
  }

  lines.push(sectionHeader("PERFORMANCE REVIEWS"));
  lines.push(csvRow([
    "Review ID", "Employee ID", "Employee Name", "Review Type", "Period", "Status",
    "Technical Score", "Communication Score", "Problem Solving Score",
    "Teamwork Score", "Leadership Score", "Overall Score",
    "Strengths", "Areas to Improve", "Goals", "Recommendation", "Created Date",
  ]));
  for (const r of reviews) {
    lines.push(csvRow([
      r.id, r.employeeId, r.employeeName, r.reviewType, r.period, r.status,
      r.technicalScore, r.communicationScore, r.problemSolvingScore,
      r.teamworkScore, r.leadershipScore, r.overallScore,
      r.strengths, r.areasToImprove, r.goals, r.recommendation,
      r.createdAt.toISOString(),
    ]));
  }

  lines.push(sectionHeader("MEETING FEEDBACK"));
  lines.push(csvRow([
    "Feedback ID", "Employee ID", "Employee Name", "Meeting Type", "Meeting Date",
    "What Went Well", "Areas to Improve", "Action Items", "Next Steps",
    "Employee Response", "Created Date",
  ]));
  for (const f of feedback) {
    lines.push(csvRow([
      f.id, f.employeeId, f.employeeName, f.meetingType, f.meetingDate,
      f.whatWentWell, f.areasToImprove, f.actionItems, f.nextSteps,
      f.employeeResponse, f.createdAt.toISOString(),
    ]));
  }

  lines.push(sectionHeader("PEER REVIEWS"));
  lines.push(csvRow([
    "Peer Review ID", "Employee ID", "Employee Name", "Peer Email",
    "Personal Planning Score", "Track Planning Score", "Solution Driven Score",
    "Team Leadership Score", "Persuasion Score", "Cross Functional Score",
    "Business Alignment Score", "Customer Centric Score", "Data Informed Score",
    "Promotion Recommendation", "Strengths", "Areas to Improve", "Submitted Date",
  ]));
  for (const p of peerReviews) {
    lines.push(csvRow([
      p.id, p.employeeId, p.employeeName, p.peerEmail,
      p.personalPlanningScore, p.trackPlanningScore, p.solutionDrivenScore,
      p.teamLeadershipScore, p.persuasionScore, p.crossFunctionalScore,
      p.businessAlignmentScore, p.customerCentricScore, p.dataInformedScore,
      p.promotionRecommendation, p.strengths, p.areasToImprove,
      p.submittedAt.toISOString(),
    ]));
  }

  const csv = lines.join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="proven-path-export.csv"');
  res.send(csv);
});

export default router;
