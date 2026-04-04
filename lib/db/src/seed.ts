import bcrypt from "bcryptjs";
import { db, pool } from "./index";
import {
  companiesTable,
  employeesTable,
  reviewsTable,
  feedbackTable,
  devPlansTable,
  devPlanSkillsTable,
} from "./schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // ── Company 1: Acme Corp ─────────────────────────────────────────────────
  const existingAcme = await db.select().from(companiesTable).where(eq(companiesTable.email, "admin@acme.com")).limit(1);
  let acmeId: number;

  if (existingAcme.length > 0) {
    acmeId = existingAcme[0].id;
    console.log("Acme Corp already exists, skipping.");
  } else {
    const [acme] = await db.insert(companiesTable).values({
      name: "Acme Corp",
      email: "admin@acme.com",
      passwordHash: await bcrypt.hash("demo1234", 10),
    }).returning();
    acmeId = acme.id;
    console.log("Created Acme Corp.");
  }

  // ── Company 2: Stellar Systems ───────────────────────────────────────────
  const existingStellar = await db.select().from(companiesTable).where(eq(companiesTable.email, "admin@stellar.com")).limit(1);
  let stellarId: number;

  if (existingStellar.length > 0) {
    stellarId = existingStellar[0].id;
    console.log("Stellar Systems already exists, skipping.");
  } else {
    const [stellar] = await db.insert(companiesTable).values({
      name: "Stellar Systems",
      email: "admin@stellar.com",
      passwordHash: await bcrypt.hash("demo1234", 10),
    }).returning();
    stellarId = stellar.id;
    console.log("Created Stellar Systems.");
  }

  // ── Acme Corp Employees ──────────────────────────────────────────────────
  const acmeEmployees = await db.select().from(employeesTable).where(eq(employeesTable.companyId, acmeId));
  let acmeEmpIds: number[] = acmeEmployees.map(e => e.id);

  if (acmeEmployees.length === 0) {
    const acmeStaff = await db.insert(employeesTable).values([
      { companyId: acmeId, name: "Sarah Chen", email: "sarah.chen@acme.com", role: "Senior Software Engineer", department: "Engineering", level: "Senior", startDate: "2021-03-15" },
      { companyId: acmeId, name: "Marcus Johnson", email: "marcus.johnson@acme.com", role: "Product Manager", department: "Product", level: "Mid", startDate: "2022-01-10" },
      { companyId: acmeId, name: "Alex Rivera", email: "alex.rivera@acme.com", role: "UX Designer", department: "Design", level: "Mid", startDate: "2022-06-20" },
      { companyId: acmeId, name: "Jordan Kim", email: "jordan.kim@acme.com", role: "Engineering Lead", department: "Engineering", level: "Lead", startDate: "2020-08-01" },
      { companyId: acmeId, name: "Priya Patel", email: "priya.patel@acme.com", role: "Data Scientist", department: "Engineering", level: "Senior", startDate: "2021-11-05" },
    ]).returning();
    acmeEmpIds = acmeStaff.map(e => e.id);
    // Sarah, Alex, Priya report to Jordan
    await db.update(employeesTable).set({ managerId: acmeEmpIds[3] }).where(eq(employeesTable.id, acmeEmpIds[0]));
    await db.update(employeesTable).set({ managerId: acmeEmpIds[3] }).where(eq(employeesTable.id, acmeEmpIds[2]));
    await db.update(employeesTable).set({ managerId: acmeEmpIds[3] }).where(eq(employeesTable.id, acmeEmpIds[4]));
    console.log("Created 5 Acme Corp employees.");
  } else {
    console.log("Acme Corp employees already exist, skipping.");
  }

  // ── Stellar Systems Employees ────────────────────────────────────────────
  const stellarEmployees = await db.select().from(employeesTable).where(eq(employeesTable.companyId, stellarId));
  let stellarEmpIds: number[] = stellarEmployees.map(e => e.id);

  if (stellarEmployees.length === 0) {
    const stellarStaff = await db.insert(employeesTable).values([
      { companyId: stellarId, name: "Emily Torres", email: "emily.torres@stellar.com", role: "Engineering Director", department: "Engineering", level: "Director", startDate: "2019-04-01" },
      { companyId: stellarId, name: "David Park", email: "david.park@stellar.com", role: "Backend Engineer", department: "Engineering", level: "Mid", startDate: "2023-02-14" },
      { companyId: stellarId, name: "Zoe Williams", email: "zoe.williams@stellar.com", role: "Marketing Manager", department: "Marketing", level: "Senior", startDate: "2021-09-20" },
      { companyId: stellarId, name: "Omar Hassan", email: "omar.hassan@stellar.com", role: "DevOps Engineer", department: "Engineering", level: "Senior", startDate: "2022-03-07" },
      { companyId: stellarId, name: "Nina Zhao", email: "nina.zhao@stellar.com", role: "Frontend Engineer", department: "Engineering", level: "Junior", startDate: "2024-01-15" },
    ]).returning();
    stellarEmpIds = stellarStaff.map(e => e.id);
    // David, Omar, Nina report to Emily
    await db.update(employeesTable).set({ managerId: stellarEmpIds[0] }).where(eq(employeesTable.id, stellarEmpIds[1]));
    await db.update(employeesTable).set({ managerId: stellarEmpIds[0] }).where(eq(employeesTable.id, stellarEmpIds[3]));
    await db.update(employeesTable).set({ managerId: stellarEmpIds[0] }).where(eq(employeesTable.id, stellarEmpIds[4]));
    console.log("Created 5 Stellar Systems employees.");
  } else {
    console.log("Stellar Systems employees already exist, skipping.");
  }

  // ── Acme Reviews ─────────────────────────────────────────────────────────
  if (acmeEmpIds.length >= 5) {
    const existingReviews = await db.select({ id: reviewsTable.id }).from(reviewsTable)
      .where(eq(reviewsTable.employeeId, acmeEmpIds[0])).limit(1);
    if (existingReviews.length === 0) {
      await db.insert(reviewsTable).values([
        { employeeId: acmeEmpIds[0], reviewerId: acmeEmpIds[3], reviewType: "manager", period: "Q4 2024", technicalScore: 5, communicationScore: 4, problemSolvingScore: 5, teamworkScore: 4, leadershipScore: 3, strengths: "Exceptional debugging skills, consistently ships high-quality code", areasToImprove: "Could take more initiative on cross-team projects", goals: "Lead a major architecture redesign in Q1 2025" },
        { employeeId: acmeEmpIds[0], reviewerId: acmeEmpIds[0], reviewType: "self", period: "Q4 2024", technicalScore: 4, communicationScore: 4, problemSolvingScore: 4, teamworkScore: 5, leadershipScore: 3, strengths: "Strong technical foundations and team collaboration", areasToImprove: "Want to grow leadership presence and mentorship skills", goals: "Mentor 2 junior engineers and complete system design certification" },
        { employeeId: acmeEmpIds[1], reviewerId: acmeEmpIds[3], reviewType: "manager", period: "Q4 2024", technicalScore: 3, communicationScore: 5, problemSolvingScore: 4, teamworkScore: 5, leadershipScore: 4, strengths: "Outstanding stakeholder management and clear product vision", areasToImprove: "Should deepen technical knowledge to better collaborate with engineers", goals: "Ship the mobile app MVP by end of Q1 2025" },
        { employeeId: acmeEmpIds[2], reviewerId: acmeEmpIds[3], reviewType: "manager", period: "Q4 2024", technicalScore: 3, communicationScore: 4, problemSolvingScore: 4, teamworkScore: 5, leadershipScore: 3, strengths: "Creative designs with strong user empathy", areasToImprove: "Needs to improve design system documentation", goals: "Build out the complete design system in Figma" },
        { employeeId: acmeEmpIds[3], reviewerId: acmeEmpIds[3], reviewType: "self", period: "Q4 2024", technicalScore: 5, communicationScore: 4, problemSolvingScore: 5, teamworkScore: 4, leadershipScore: 5, strengths: "Strong technical leadership and team development", areasToImprove: "Delegate more to free up time for strategic initiatives", goals: "Grow the engineering team by 3 and establish an on-call rotation" },
        { employeeId: acmeEmpIds[4], reviewerId: acmeEmpIds[3], reviewType: "manager", period: "Q4 2024", technicalScore: 5, communicationScore: 3, problemSolvingScore: 5, teamworkScore: 4, leadershipScore: 3, strengths: "Deep analytical skills, excellent at surfacing data insights", areasToImprove: "Communication of findings to non-technical audiences can be clearer", goals: "Present monthly data health reports to the leadership team" },
      ]);
      console.log("Created 6 Acme Corp reviews.");
    } else {
      console.log("Acme Corp reviews already exist, skipping.");
    }
  }

  // ── Stellar Reviews ───────────────────────────────────────────────────────
  if (stellarEmpIds.length >= 5) {
    const existingStellarReviews = await db.select({ id: reviewsTable.id }).from(reviewsTable)
      .where(eq(reviewsTable.employeeId, stellarEmpIds[1])).limit(1);
    if (existingStellarReviews.length === 0) {
      await db.insert(reviewsTable).values([
        { employeeId: stellarEmpIds[1], reviewerId: stellarEmpIds[0], reviewType: "manager", period: "Q4 2024", technicalScore: 3, communicationScore: 3, problemSolvingScore: 3, teamworkScore: 4, leadershipScore: 2, strengths: "Eager learner, good team fit", areasToImprove: "Needs to build confidence in code reviews and API design", goals: "Independently own a backend service by Q2 2025" },
        { employeeId: stellarEmpIds[3], reviewerId: stellarEmpIds[0], reviewType: "manager", period: "Q4 2024", technicalScore: 5, communicationScore: 4, problemSolvingScore: 4, teamworkScore: 4, leadershipScore: 3, strengths: "Reliable, excellent incident response, strong Kubernetes knowledge", areasToImprove: "Could document runbooks more thoroughly", goals: "Achieve zero-downtime deployments for all production services" },
        { employeeId: stellarEmpIds[4], reviewerId: stellarEmpIds[0], reviewType: "manager", period: "Q4 2024", technicalScore: 3, communicationScore: 4, problemSolvingScore: 3, teamworkScore: 5, leadershipScore: 2, strengths: "Great communication, fast learner, positive attitude", areasToImprove: "Needs to take more ownership of features end-to-end", goals: "Ship 3 features independently in Q1 2025" },
      ]);
      console.log("Created 3 Stellar Systems reviews.");
    } else {
      console.log("Stellar Systems reviews already exist, skipping.");
    }
  }

  // ── Acme Feedback ─────────────────────────────────────────────────────────
  if (acmeEmpIds.length >= 5) {
    const existingFeedback = await db.select({ id: feedbackTable.id }).from(feedbackTable)
      .where(eq(feedbackTable.employeeId, acmeEmpIds[0])).limit(1);
    if (existingFeedback.length === 0) {
      await db.insert(feedbackTable).values([
        { employeeId: acmeEmpIds[0], managerId: acmeEmpIds[3], meetingType: "one_on_one", meetingDate: "2024-11-15", whatWentWell: "Delivered the auth refactor ahead of schedule", areasToImprove: "Should speak up more in architecture meetings", actionItems: "Present the new auth design at the next engineering all-hands" },
        { employeeId: acmeEmpIds[0], managerId: acmeEmpIds[3], meetingType: "career_conversation", meetingDate: "2024-12-01", whatWentWell: "Great technical depth and dedication to code quality", areasToImprove: "Start mentoring junior developers to grow leadership skills", actionItems: "Pair-program with the 2 new hires for at least 2 hours/week" },
        { employeeId: acmeEmpIds[1], managerId: acmeEmpIds[3], meetingType: "performance_check_in", meetingDate: "2024-11-20", whatWentWell: "Roadmap is clearly communicated, good stakeholder alignment", areasToImprove: "User stories sometimes lack enough technical acceptance criteria", actionItems: "Use the new story template and review with engineering before sprint planning" },
        { employeeId: acmeEmpIds[4], managerId: acmeEmpIds[3], meetingType: "one_on_one", meetingDate: "2024-12-10", whatWentWell: "Excellent analysis of the user retention drop, actionable insights", areasToImprove: "Executive summary slides need to be simpler for non-technical stakeholders", actionItems: "Create a one-page data brief template and share with the team" },
      ]);
      console.log("Created 4 Acme Corp feedback sessions.");
    } else {
      console.log("Acme Corp feedback already exists, skipping.");
    }
  }

  // ── Stellar Feedback ──────────────────────────────────────────────────────
  if (stellarEmpIds.length >= 5) {
    const existingStellarFeedback = await db.select({ id: feedbackTable.id }).from(feedbackTable)
      .where(eq(feedbackTable.employeeId, stellarEmpIds[1])).limit(1);
    if (existingStellarFeedback.length === 0) {
      await db.insert(feedbackTable).values([
        { employeeId: stellarEmpIds[1], managerId: stellarEmpIds[0], meetingType: "one_on_one", meetingDate: "2024-12-05", whatWentWell: "Good progress on the payment API", areasToImprove: "Should ask for help earlier instead of getting stuck", actionItems: "Daily async check-ins with senior engineer during complex tasks" },
        { employeeId: stellarEmpIds[4], managerId: stellarEmpIds[0], meetingType: "career_conversation", meetingDate: "2024-12-12", whatWentWell: "Great collaboration with the design team, clean component code", areasToImprove: "Needs to write more unit tests and understand the CI pipeline", actionItems: "Complete the internal testing workshop by end of January" },
      ]);
      console.log("Created 2 Stellar Systems feedback sessions.");
    } else {
      console.log("Stellar Systems feedback already exists, skipping.");
    }
  }

  // ── Acme Dev Plans ────────────────────────────────────────────────────────
  if (acmeEmpIds.length >= 1) {
    const existingDevPlan = await db.select({ id: devPlansTable.id }).from(devPlansTable)
      .where(eq(devPlansTable.employeeId, acmeEmpIds[0])).limit(1);
    if (existingDevPlan.length === 0) {
      const [devPlan] = await db.insert(devPlansTable).values({
        employeeId: acmeEmpIds[0],
        summary: "Sarah is a high-performing senior engineer with exceptional technical skills. The primary growth area is leadership — taking ownership of cross-functional initiatives, mentoring junior engineers, and elevating her architectural influence. A secondary focus should be on communication to increase visibility of her work at the leadership level.",
        generatedAt: new Date("2024-12-15"),
      }).returning();

      await db.insert(devPlanSkillsTable).values([
        { devPlanId: devPlan.id, skillName: "Technical Leadership", priority: 1, description: "Transition from individual contributor to technical leader by driving architectural decisions and mentoring others.", resources: "Staff Engineer Path by Tanya Reilly, LeadDev conference talks, Engineering leadership Slack communities", timeline: "3 months", nextSteps: "Volunteer to lead the next architecture review session" },
        { devPlanId: devPlan.id, skillName: "Mentorship", priority: 2, description: "Develop junior engineers through consistent 1:1 guidance and code reviews.", resources: "The Manager's Path by Camille Fournier, internal mentorship program", timeline: "Ongoing", nextSteps: "Schedule weekly 30-min pairing sessions with each of the 2 new hires", completed: true, completedAt: new Date("2025-01-10") },
        { devPlanId: devPlan.id, skillName: "Executive Communication", priority: 3, description: "Present complex technical decisions clearly to non-technical stakeholders.", resources: "Simply Said by Jay Sullivan, internal presentation skills workshop", timeline: "2 months", nextSteps: "Prepare and deliver the auth redesign presentation at the next all-hands" },
        { devPlanId: devPlan.id, skillName: "System Design", priority: 4, description: "Deepen knowledge of distributed systems to contribute to company-wide architecture discussions.", resources: "Designing Data-Intensive Applications by Kleppmann, System Design Interview vol 2", timeline: "4 months", nextSteps: "Complete 2 system design practice problems per week on Exponent" },
      ]);
      console.log("Created dev plan for Sarah Chen.");
    } else {
      console.log("Sarah Chen dev plan already exists, skipping.");
    }
  }

  console.log("\nSeed complete!");
  console.log("Demo accounts:");
  console.log("  Acme Corp:       admin@acme.com    / demo1234");
  console.log("  Stellar Systems: admin@stellar.com / demo1234");
}

seed()
  .catch(err => { console.error("Seed failed:", err); process.exit(1); })
  .finally(() => pool.end());
