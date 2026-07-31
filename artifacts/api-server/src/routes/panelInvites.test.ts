import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import crypto from "crypto";
import {
  db,
  companiesTable,
  candidateProfilesTable,
  interviewAssessmentsTable,
  panelInvitesTable,
  notificationsTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import panelInvitesRouter from "./panelInvites";

// Minimal app hosting only the routes under test (public token routes need no auth).
const app = express();
app.use(express.json());
app.use(panelInvitesRouter);

let companyId: number;
let candidateId: number;
const createdInviteIds: number[] = [];

function newToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function createInvite(overrides: Partial<typeof panelInvitesTable.$inferInsert> = {}) {
  const [invite] = await db.insert(panelInvitesTable).values({
    companyId,
    candidateId,
    invitedByUserId: 999999,
    email: "panelist@example.com",
    role: "software_engineer",
    level: "senior",
    interviewDate: "2026-07-30",
    token: newToken(),
    status: "pending",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ...overrides,
  }).returning();
  createdInviteIds.push(invite.id);
  return invite;
}

const validBody = {
  scores: { "System design": 4, "Code quality": 5 },
  feedback: { "System design": "Solid tradeoff discussion" },
  overallRecommendation: "yes",
  notes: "Strong candidate overall",
};

beforeAll(async () => {
  const [company] = await db.insert(companiesTable).values({
    name: `__test_panel_co_${Date.now()}`,
    email: `__test_panel_co_${Date.now()}@example.com`,
    passwordHash: "test-hash",
  } as typeof companiesTable.$inferInsert).returning();
  companyId = company.id;

  const [candidate] = await db.insert(candidateProfilesTable).values({
    companyId,
    name: "Test Candidate",
    roleApplyingFor: "software_engineer",
  } as typeof candidateProfilesTable.$inferInsert).returning();
  candidateId = candidate.id;
});

afterAll(async () => {
  await db.delete(notificationsTable).where(eq(notificationsTable.companyId, companyId));
  await db.delete(interviewAssessmentsTable).where(eq(interviewAssessmentsTable.candidateId, candidateId));
  if (createdInviteIds.length) {
    await db.delete(panelInvitesTable).where(inArray(panelInvitesTable.id, createdInviteIds));
  }
  await db.delete(candidateProfilesTable).where(eq(candidateProfilesTable.id, candidateId));
  await db.delete(companiesTable).where(eq(companiesTable.id, companyId));
});

beforeEach(async () => {
  await db.delete(interviewAssessmentsTable).where(eq(interviewAssessmentsTable.candidateId, candidateId));
});

describe("GET /panel-assessment/:token", () => {
  it("returns invite info for a valid pending token", async () => {
    const invite = await createInvite();
    const res = await request(app).get(`/panel-assessment/${invite.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      candidateName: "Test Candidate",
      role: "software_engineer",
      level: "senior",
      interviewDate: "2026-07-30",
      panelistEmail: "panelist@example.com",
    });
  });

  it("returns 404 for an unknown token", async () => {
    const res = await request(app).get(`/panel-assessment/${newToken()}`);
    expect(res.status).toBe(404);
  });

  it("returns 410 for an expired token", async () => {
    const invite = await createInvite({ expiresAt: new Date(Date.now() - 1000) });
    const res = await request(app).get(`/panel-assessment/${invite.token}`);
    expect(res.status).toBe(410);
  });

  it("returns 409 for an already-completed invite", async () => {
    const invite = await createInvite({ status: "completed" });
    const res = await request(app).get(`/panel-assessment/${invite.token}`);
    expect(res.status).toBe(409);
  });
});

describe("POST /panel-assessment/:token/submit", () => {
  it("accepts a valid submission exactly once and stores the assessment", async () => {
    const invite = await createInvite();

    const res = await request(app).post(`/panel-assessment/${invite.token}/submit`).send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const rows = await db.select().from(interviewAssessmentsTable)
      .where(eq(interviewAssessmentsTable.panelInviteId, invite.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].panelistEmail).toBe("panelist@example.com");
    expect(rows[0].overallScore).toBe("4.50");
    expect(rows[0].overallRecommendation).toBe("yes");

    const [updated] = await db.select().from(panelInvitesTable).where(eq(panelInvitesTable.id, invite.id));
    expect(updated.status).toBe("completed");

    // Second sequential submit is rejected
    const again = await request(app).post(`/panel-assessment/${invite.token}/submit`).send(validBody);
    expect(again.status).toBe(409);

    const rowsAfter = await db.select().from(interviewAssessmentsTable)
      .where(eq(interviewAssessmentsTable.panelInviteId, invite.id));
    expect(rowsAfter).toHaveLength(1);
  });

  it("creates exactly one assessment under concurrent submissions of the same token", async () => {
    const invite = await createInvite();

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app).post(`/panel-assessment/${invite.token}/submit`).send(validBody)
      )
    );

    const successes = results.filter(r => r.status === 201);
    const conflicts = results.filter(r => r.status === 409);
    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(4);

    const rows = await db.select().from(interviewAssessmentsTable)
      .where(eq(interviewAssessmentsTable.panelInviteId, invite.id));
    expect(rows).toHaveLength(1);
  });

  it("returns 404 for an unknown token and 410 for an expired one", async () => {
    const unknown = await request(app).post(`/panel-assessment/${newToken()}/submit`).send(validBody);
    expect(unknown.status).toBe(404);

    const expired = await createInvite({ expiresAt: new Date(Date.now() - 1000) });
    const res = await request(app).post(`/panel-assessment/${expired.token}/submit`).send(validBody);
    expect(res.status).toBe(410);

    const rows = await db.select().from(interviewAssessmentsTable)
      .where(eq(interviewAssessmentsTable.panelInviteId, expired.id));
    expect(rows).toHaveLength(0);
  });

  it("rejects submissions with no valid scores", async () => {
    const invite = await createInvite();
    for (const scores of [undefined, {}, { skill: 0 }, { skill: 6 }, { skill: "5" }, { skill: 4.5 }]) {
      const res = await request(app).post(`/panel-assessment/${invite.token}/submit`).send({ scores });
      expect(res.status).toBe(400);
    }
    // Invite must remain claimable after rejected attempts
    const [row] = await db.select().from(panelInvitesTable).where(eq(panelInvitesTable.id, invite.id));
    expect(row.status).toBe("pending");
  });

  it("bounds and sanitizes the payload", async () => {
    const invite = await createInvite();
    const res = await request(app).post(`/panel-assessment/${invite.token}/submit`).send({
      scores: {
        "Valid skill": 3,
        ["x".repeat(300)]: 5,          // key too long — dropped
        "Bad score": 99,               // out of range — dropped
      },
      feedback: {
        "Valid skill": "y".repeat(5000),   // truncated to 2000
        "Unscored skill": "should be dropped",
      },
      overallRecommendation: "definitely_hire", // not in enum — nulled
      notes: "n".repeat(10000),               // truncated to 5000
    });
    expect(res.status).toBe(201);

    const [row] = await db.select().from(interviewAssessmentsTable)
      .where(eq(interviewAssessmentsTable.panelInviteId, invite.id));
    const scores = JSON.parse(row.scores!);
    expect(Object.keys(scores)).toEqual(["Valid skill"]);
    const feedback = JSON.parse(row.feedback!);
    expect(Object.keys(feedback)).toEqual(["Valid skill"]);
    expect(feedback["Valid skill"]).toHaveLength(2000);
    expect(row.overallRecommendation).toBeNull();
    expect(row.notes).toHaveLength(5000);
    expect(row.overallScore).toBe("3.00");
  });

  it("caps the number of accepted score keys at 100", async () => {
    const invite = await createInvite();
    const scores: Record<string, number> = {};
    for (let i = 0; i < 150; i++) scores[`skill_${i}`] = 3;

    const res = await request(app).post(`/panel-assessment/${invite.token}/submit`).send({ scores });
    expect(res.status).toBe(201);

    const [row] = await db.select().from(interviewAssessmentsTable)
      .where(eq(interviewAssessmentsTable.panelInviteId, invite.id));
    expect(Object.keys(JSON.parse(row.scores!)).length).toBeLessThanOrEqual(100);
  });

  it("notifies the inviter on successful submission", async () => {
    const invite = await createInvite({ invitedByUserId: 424242 });
    await request(app).post(`/panel-assessment/${invite.token}/submit`).send(validBody);

    const notes = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.companyId, companyId));
    const mine = notes.filter(n => n.userId === 424242 && n.type === "panel_assessment_completed");
    expect(mine.length).toBe(1);
    expect(mine[0].message).toContain("Test Candidate");
  });
});
