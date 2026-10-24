import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { db, companiesTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { requireAuth, signToken } from "../middlewares/auth";
import { requireActivePlan } from "../middlewares/requireActivePlan";
import employeesRouter from "./employees";
import stripeRouter from "./stripe";

const app = express();
app.use(express.json());
app.use(employeesRouter);
app.use(stripeRouter);
app.get("/active-feature", requireAuth, requireActivePlan, (_req, res) => {
  res.sendStatus(204);
});

const companyIds: number[] = [];
let complimentaryToken: string;
let ordinaryToken: string;

beforeAll(async () => {
  for (const complimentaryTeamAccess of [true, false]) {
    const email = `__test_complimentary_${Date.now()}_${complimentaryTeamAccess}@example.test`;
    const [company] = await db.insert(companiesTable).values({
      name: "Complimentary access test",
      email,
      passwordHash: "not-a-login-fixture",
      complimentaryTeamAccess,
      plan: "trial",
      trialEndsAt: null,
    }).returning();
    companyIds.push(company.id);
    const token = signToken({
      companyId: company.id, userId: company.id, email, role: "admin", employeeId: null,
    });
    if (complimentaryTeamAccess) complimentaryToken = token;
    else ordinaryToken = token;
  }
});

afterAll(async () => {
  if (companyIds.length) {
    await db.delete(companiesTable).where(inArray(companiesTable.id, companyIds));
  }
});

describe("complimentary company access", () => {
  it("reports complimentary Team access without claiming a paid subscription", async () => {
    const res = await request(app).get("/stripe/subscription")
      .auth(complimentaryToken, { type: "bearer" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      complimentaryAccess: true, teamAccess: true, hasActiveAccess: true,
      subscriptionActive: false, trialActive: false,
    });
  });

  it("opens Team and active-plan features for the explicitly granted company", async () => {
    const directory = await request(app).get("/employees")
      .auth(complimentaryToken, { type: "bearer" });
    expect(directory.status).toBe(200);
    expect(directory.body).toEqual([]);
    const feature = await request(app).get("/active-feature")
      .auth(complimentaryToken, { type: "bearer" });
    expect(feature.status).toBe(204);
  });

  it("keeps ordinary expired companies restricted even when the login is an admin", async () => {
    const directory = await request(app).get("/employees")
      .auth(ordinaryToken, { type: "bearer" });
    expect(directory.status).toBe(403);
    const feature = await request(app).get("/active-feature")
      .auth(ordinaryToken, { type: "bearer" });
    expect(feature.status).toBe(402);
    const status = await request(app).get("/stripe/subscription")
      .auth(ordinaryToken, { type: "bearer" });
    expect(status.body).toMatchObject({
      complimentaryAccess: false, teamAccess: false, hasActiveAccess: false,
    });
  });
});
