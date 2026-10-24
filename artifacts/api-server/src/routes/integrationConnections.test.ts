import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { db, companiesTable, integrationConnectionsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { signToken } from "../middlewares/auth";
import integrationsRouter from "./integrations";

const app = express();
app.use(express.json());
app.use(integrationsRouter);
const companyIds: number[] = [];
const tokens: string[] = [];

beforeAll(async () => {
  for (let i = 0; i < 2; i++) {
    const email = `__test_integrations_${Date.now()}_${i}@example.test`;
    const [company] = await db.insert(companiesTable).values({
      name: "Integration connection tests", email,
      passwordHash: "not-a-login-fixture", complimentaryTeamAccess: true,
    }).returning();
    companyIds.push(company.id);
    tokens.push(signToken({
      companyId: company.id, userId: company.id, email, role: "admin", employeeId: null,
    }));
  }
});

beforeEach(async () => {
  await db.delete(integrationConnectionsTable)
    .where(inArray(integrationConnectionsTable.companyId, companyIds));
});

afterAll(async () => {
  if (companyIds.length) {
    await db.delete(integrationConnectionsTable)
      .where(inArray(integrationConnectionsTable.companyId, companyIds));
    await db.delete(companiesTable).where(inArray(companiesTable.id, companyIds));
  }
});

function connect(provider: string, category = "meeting", token = tokens[0], accountLabel?: string) {
  return request(app).post("/integrations/connect").auth(token, { type: "bearer" })
    .send({ category, provider, accountLabel });
}

async function list(token = tokens[0]) {
  const response = await request(app).get("/integrations").auth(token, { type: "bearer" });
  expect(response.status).toBe(200);
  return response.body.connections as { id: number; provider: string; category: string; accountLabel: string }[];
}

describe("multiple meeting intelligence connections", () => {
  it("persists multiple providers and reconnects one without duplicating or replacing others", async () => {
    const first = await connect("fireflies");
    expect(first.status).toBe(200);
    expect((await connect("granola")).status).toBe(200);
    const reconnected = await connect("fireflies", "meeting", tokens[0], "Updated workspace");
    expect(reconnected.status).toBe(200);
    expect(reconnected.body.connection.id).toBe(first.body.connection.id);
    const connections = await list();
    expect(connections).toHaveLength(2);
    expect(connections.find(c => c.provider === "fireflies")?.accountLabel).toBe("Updated workspace");
    expect(connections.some(c => c.provider === "granola")).toBe(true);
  });

  it("disconnects only the selected provider and refuses category-wide meeting deletion", async () => {
    await connect("fireflies");
    await connect("otter");
    const missingProvider = await request(app).post("/integrations/disconnect")
      .auth(tokens[0], { type: "bearer" }).send({ category: "meeting" });
    expect(missingProvider.status).toBe(400);
    expect(await list()).toHaveLength(2);
    const disconnected = await request(app).post("/integrations/disconnect")
      .auth(tokens[0], { type: "bearer" }).send({ category: "meeting", provider: "fireflies" });
    expect(disconnected.status).toBe(200);
    expect((await list()).map(c => c.provider)).toEqual(["otter"]);
  });

  it("scopes connection changes to the authenticated company", async () => {
    await connect("notion");
    await request(app).post("/integrations/disconnect")
      .auth(tokens[1], { type: "bearer" }).send({ category: "meeting", provider: "notion" });
    expect(await list()).toHaveLength(1);
    expect(await list(tokens[1])).toHaveLength(0);
  });

  it("retains single-provider behavior for HRIS and ATS", async () => {
    for (const [category, first, second] of [
      ["hris", "workday", "bamboohr"], ["ats", "greenhouse", "lever"],
    ]) {
      expect((await connect(first, category)).status).toBe(200);
      expect((await connect(second, category)).status).toBe(200);
      const connections = (await list()).filter(c => c.category === category);
      expect(connections.map(c => c.provider)).toEqual([second]);
    }
  });

  it("rejects unknown providers and malformed account labels", async () => {
    expect((await connect("unknown-provider")).status).toBe(400);
    const malformed = await request(app).post("/integrations/connect")
      .auth(tokens[0], { type: "bearer" })
      .send({ category: "meeting", provider: "granola", accountLabel: 123 });
    expect(malformed.status).toBe(400);
    expect(await list()).toHaveLength(0);
  });
});
