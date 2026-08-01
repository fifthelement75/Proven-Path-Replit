import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import crypto from "crypto";
import {
  db,
  companiesTable,
  employeesTable,
  peerReviewRequestsTable,
  peerReviewsTable,
  notificationsTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import peerReviewsRouter, { __setAfterClaimHookForTests } from "./peerReviews";

// Public token routes need no auth middleware.
const app = express();
app.use(express.json());
app.use(peerReviewsRouter);

let companyId: number;
let employeeId: number;
const createdRequestIds: number[] = [];

function newToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function createRequest(overrides: Partial<typeof peerReviewRequestsTable.$inferInsert> = {}) {
  const [req] = await db.insert(peerReviewRequestsTable).values({
    employeeId,
    companyId,
    requestedByUserId: 999999,
    peerEmail: "peer@example.com",
    peerName: "Pat Peer",
    token: newToken(),
    status: "pending",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ...overrides,
  }).returning();
  createdRequestIds.push(req.id);
  return req;
}

beforeAll(async () => {
  const [company] = await db.insert(companiesTable).values({
    name: `__test_peer_co_${Date.now()}`,
    email: `__test_peer_co_${Date.now()}@example.com`,
    passwordHash: "test-hash",
  } as typeof companiesTable.$inferInsert).returning();
  companyId = company.id;

  const [emp] = await db.insert(employeesTable).values({
    companyId,
    name: "Peer Review Subject",
    email: `__test_peer_emp_${Date.now()}@example.com`,
    role: "Product Manager",
    department: "Product",
    level: "senior",
    startDate: "2024-01-01",
  } as typeof employeesTable.$inferInsert).returning();
  employeeId = emp.id;
});

afterAll(async () => {
  await db.delete(notificationsTable).where(eq(notificationsTable.companyId, companyId));
  await db.delete(peerReviewsTable).where(eq(peerReviewsTable.companyId, companyId));
  if (createdRequestIds.length) {
    await db.delete(peerReviewRequestsTable).where(inArray(peerReviewRequestsTable.id, createdRequestIds));
  }
  await db.delete(employeesTable).where(eq(employeesTable.id, employeeId));
  await db.delete(companiesTable).where(eq(companiesTable.id, companyId));
});

beforeEach(async () => {
  __setAfterClaimHookForTests(undefined);
  await db.delete(peerReviewsTable).where(eq(peerReviewsTable.companyId, companyId));
});

describe("GET /peer-review/:token", () => {
  it("returns request info for a valid pending token", async () => {
    const req = await createRequest();
    const res = await request(app).get(`/peer-review/${req.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      requestId: req.id,
      employeeId,
      employeeName: "Peer Review Subject",
      peerEmail: "peer@example.com",
      peerName: "Pat Peer",
    });
  });

  it("returns 404 for an unknown token", async () => {
    const res = await request(app).get(`/peer-review/${newToken()}`);
    expect(res.status).toBe(404);
  });

  it("returns 410 for an expired token", async () => {
    const req = await createRequest({ expiresAt: new Date(Date.now() - 1000) });
    const res = await request(app).get(`/peer-review/${req.token}`);
    expect(res.status).toBe(410);
  });

  it("returns 409 once a review has been submitted", async () => {
    const req = await createRequest();
    await db.insert(peerReviewsTable).values({
      requestId: req.id,
      employeeId,
      companyId,
      peerEmail: "peer@example.com",
    });
    const res = await request(app).get(`/peer-review/${req.token}`);
    expect(res.status).toBe(409);
  });
});

describe("POST /peer-review/:token/submit", () => {
  const validBody = {
    personalPlanningScore: "often_exceeds",
    personalPlanningComment: "Great planning",
    promotionRecommendation: "yes",
    strengths: "Communication",
    areasToImprove: "Delegation",
  };

  it("accepts a valid submission, completes the request, and notifies the requester", async () => {
    const req = await createRequest({ requestedByUserId: 424242 });
    const res = await request(app).post(`/peer-review/${req.token}/submit`).send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const [review] = await db.select().from(peerReviewsTable).where(eq(peerReviewsTable.requestId, req.id));
    expect(review.peerEmail).toBe("peer@example.com");
    expect(review.promotionRecommendation).toBe("yes");
    expect(review.personalPlanningScore).toBe("often_exceeds"); // valid score persisted, not nulled
    expect(review.personalPlanningComment).toBe("Great planning");

    const [after] = await db.select().from(peerReviewRequestsTable).where(eq(peerReviewRequestsTable.id, req.id));
    expect(after.status).toBe("completed");

    const notes = await db.select().from(notificationsTable).where(eq(notificationsTable.companyId, companyId));
    const mine = notes.filter(n => n.userId === 424242 && n.type === "peer_review_completed");
    expect(mine.length).toBe(1);
  });

  it("rejects a second submission for the same token with 409", async () => {
    const req = await createRequest();
    const first = await request(app).post(`/peer-review/${req.token}/submit`).send(validBody);
    expect(first.status).toBe(201);
    const again = await request(app).post(`/peer-review/${req.token}/submit`).send(validBody);
    expect(again.status).toBe(409);

    const rows = await db.select().from(peerReviewsTable).where(eq(peerReviewsTable.requestId, req.id));
    expect(rows).toHaveLength(1);
  });

  it("creates exactly one review under concurrent submissions of the same token", async () => {
    const req = await createRequest();
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app).post(`/peer-review/${req.token}/submit`).send(validBody)
      )
    );

    expect(results.filter(r => r.status === 201)).toHaveLength(1);
    expect(results.filter(r => r.status === 409)).toHaveLength(4);

    const rows = await db.select().from(peerReviewsTable).where(eq(peerReviewsTable.requestId, req.id));
    expect(rows).toHaveLength(1);
  });

  it("returns 404 for an unknown token and 410 for an expired one", async () => {
    const unknown = await request(app).post(`/peer-review/${newToken()}/submit`).send(validBody);
    expect(unknown.status).toBe(404);

    const expired = await createRequest({ expiresAt: new Date(Date.now() - 1000) });
    const res = await request(app).post(`/peer-review/${expired.token}/submit`).send(validBody);
    expect(res.status).toBe(410);
  });

  it("rolls back the claim when review insertion fails, keeping the token retryable", async () => {
    const req = await createRequest();
    __setAfterClaimHookForTests(async () => {
      throw new Error("simulated post-claim failure");
    });

    const failed = await request(app).post(`/peer-review/${req.token}/submit`).send(validBody);
    expect(failed.status).toBe(500);

    // Claim rolled back: no review stored, request still pending.
    const rows = await db.select().from(peerReviewsTable).where(eq(peerReviewsTable.requestId, req.id));
    expect(rows).toHaveLength(0);
    const [after] = await db.select().from(peerReviewRequestsTable).where(eq(peerReviewRequestsTable.id, req.id));
    expect(after.status).toBe("pending");

    // Retry succeeds once the failure clears.
    __setAfterClaimHookForTests(undefined);
    const retry = await request(app).post(`/peer-review/${req.token}/submit`).send(validBody);
    expect(retry.status).toBe(201);
  });

  it("nulls invalid scores and recommendations instead of storing them", async () => {
    const req = await createRequest();
    const res = await request(app).post(`/peer-review/${req.token}/submit`).send({
      personalPlanningScore: "amazing",         // not a valid score value
      promotionRecommendation: "definitely",    // not in enum
      strengths: "Focus",
    });
    expect(res.status).toBe(201);

    const [review] = await db.select().from(peerReviewsTable).where(eq(peerReviewsTable.requestId, req.id));
    expect(review.personalPlanningScore).toBeNull();
    expect(review.promotionRecommendation).toBeNull();
    expect(review.strengths).toBe("Focus");
  });
});
