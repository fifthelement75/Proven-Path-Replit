import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { db, companiesTable, integrationConnectionsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { signToken } from "../middlewares/auth";
import integrationsRouter from "./integrations";
import { listCompanyAccounts } from "../lib/pipedreamConnect";
import { verifyFirefliesAccess } from "../lib/firefliesMeetings";

vi.mock("../lib/firefliesMeetings", () => ({
  verifyFirefliesAccess: vi.fn(async () => undefined),
}));

vi.mock("../lib/pipedreamConnect", async importOriginal => {
  const actual = await importOriginal<typeof import("../lib/pipedreamConnect")>();
  return {
    ...actual,
    listCompanyAccounts: vi.fn(async (companyId: number, provider: string) => [{
      id: `apn_test_${companyId}_${provider}`, external_id: actual.companyExternalId(companyId),
      app: { name_slug: provider }, healthy: true, dead: false, updated_at: new Date().toISOString(),
    }]),
    pdRequest: vi.fn(async (path: string) => {
      const match = path.match(/apn_test_(\d+)_(\w+)/);
      return match ? { external_id: actual.companyExternalId(Number(match[1])), app: { name_slug: match[2] } } : {};
    }),
    createAuthorization: vi.fn(async () => ({ authorizationUrl: "https://connect.pipedream.com/test", environment: "development" })),
    verifyAccount: vi.fn(async () => ({ healthy: true })),
    connectEnvironment: () => "development",
  };
});

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
  vi.clearAllMocks();
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
  it("does not save an apparently healthy broker account when Fireflies API access fails", async () => {
    vi.mocked(verifyFirefliesAccess).mockRejectedValueOnce(new Error("provider rejected read"));
    expect((await connect("fireflies")).status).toBe(500);
    expect(await list()).toHaveLength(0);
  });

  it("does not mark a provider connected until customer authorization is healthy", async () => {
    vi.mocked(listCompanyAccounts).mockResolvedValueOnce([]);
    const response = await connect("fireflies");
    expect(response.status).toBe(409);
    expect(await list()).toHaveLength(0);
  });

  it("marks legacy metadata-only selections as needing authorization", async () => {
    await db.insert(integrationConnectionsTable).values({ companyId: companyIds[0], category: "meeting", provider: "granola" });
    const response = await request(app).get("/integrations").auth(tokens[0], { type: "bearer" });
    expect(response.body.connections[0].status).toBe("needs_authorization");
  });
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
    await connect("granola");
    const missingProvider = await request(app).post("/integrations/disconnect")
      .auth(tokens[0], { type: "bearer" }).send({ category: "meeting" });
    expect(missingProvider.status).toBe(400);
    expect(await list()).toHaveLength(2);
    const disconnected = await request(app).post("/integrations/disconnect")
      .auth(tokens[0], { type: "bearer" }).send({ category: "meeting", provider: "fireflies" });
    expect(disconnected.status).toBe(200);
    expect((await list()).map(c => c.provider)).toEqual(["granola"]);
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
