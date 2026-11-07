import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { db, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken } from "../middlewares/auth";
import { ensureCustomerCredentialSchema } from "../lib/ensureCustomerCredentialSchema";
import app from "../app";

let companyId: number;
let adminToken: string;
let employeeToken: string;

beforeAll(async () => {
  await ensureCustomerCredentialSchema();
  const [company] = await db.insert(companiesTable).values({
    name: "Credential readiness test",
    email: `__credential_readiness_${crypto.randomUUID()}@example.test`,
    passwordHash: "not-a-login-fixture",
  }).returning();
  companyId = company.id;
  adminToken = signToken({ companyId, userId: companyId, email: company.email, role: "admin", employeeId: null });
  employeeToken = signToken({ companyId, userId: companyId, email: company.email, role: "employee", employeeId: null });
});

beforeEach(() => {
  vi.stubEnv("PIPEDREAM_ENVIRONMENT", "development");
  vi.stubEnv("CUSTOMER_CREDENTIAL_KEYS", JSON.stringify({
    current: Buffer.alloc(32, 7).toString("base64"),
  }));
  vi.stubEnv("CUSTOMER_CREDENTIAL_ACTIVE_KEY_ID", "current");
  vi.stubEnv("CUSTOMER_CREDENTIAL_LEGACY_SECRET", "test-only-legacy-secret-with-more-than-32-characters");
});

afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
  if (companyId) await db.delete(companiesTable).where(eq(companiesTable.id, companyId));
});

describe("customer credential readiness health report", () => {
  it("keeps the public liveness endpoint generic", async () => {
    const response = await request(app).get("/api/healthz");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("requires an authenticated company admin", async () => {
    expect((await request(app).get("/api/healthz/customer-credential-encryption")).status).toBe(401);
    expect((await request(app).get("/api/healthz/customer-credential-encryption")
      .auth(employeeToken, { type: "bearer" })).status).toBe(403);
  });

  it("returns only a no-store, company-scoped, redacted readiness report", async () => {
    const response = await request(app).get("/api/healthz/customer-credential-encryption")
      .auth(adminToken, { type: "bearer" });

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toContain("no-store");
    expect(response.body).toMatchObject({
      status: "ready",
      environment: "development",
      configurationCategory: null,
      configuredKeyCount: 1,
      legacyDecryptionConfigured: true,
      blockingCategories: [],
      counts: {
        total: 0,
        legacyV1: 0,
        version2: 0,
        missingHistoricalKey: 0,
        unverifiableVersion2: 0,
        legacyKeyUnavailable: 0,
        unrecognizedEnvelope: 0,
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("current");
    expect(JSON.stringify(response.body)).not.toContain("test-only-legacy");
  });
});
