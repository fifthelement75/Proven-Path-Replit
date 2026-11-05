import { afterEach, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import express from "express";
import request from "supertest";
import { db, companiesTable, integrationConnectionsTable, integrationCredentialsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { ensureCustomerCredentialSchema } from "./ensureCustomerCredentialSchema";
import { signToken } from "../middlewares/auth";
import router from "../routes/integrations";

vi.mock("./pipedreamConnect", async original => ({
  ...await original<typeof import("./pipedreamConnect")>(),
  connectEnvironment: () => "development",
  listCompanyAccounts: vi.fn(async (companyId: number, provider: string) => [{
    id: "apn_migration_test", external_id: `provenpath:company:${companyId}`, app: { name_slug: provider }, healthy: true,
  }]),
  verifyAccount: vi.fn(async () => ({ healthy: true })),
}));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("upgrades the prior schema before saving direct or existing Pipedream connections", async () => {
  vi.stubEnv("SESSION_SECRET", "migration-test-only-key-with-at-least-32-characters");
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: [] }))));
  const schema = `credential_upgrade_${crypto.randomBytes(8).toString("hex")}`;
  const transaction = db.transaction.bind(db);
  await transaction(async tx => {
    // Test a real prior-schema database namespace without dropping or changing
    // any live table. All endpoint queries below use this transaction's path.
    await tx.execute(sql.raw(`CREATE SCHEMA "${schema}"`));
    await tx.execute(sql.raw(`SET LOCAL search_path TO "${schema}", public`));
    await tx.execute(sql`CREATE TABLE "companies" (LIKE public.companies INCLUDING ALL)`);
    await tx.execute(sql`CREATE TABLE "integration_connections" (LIKE public.integration_connections INCLUDING ALL)`);
    const absent = await tx.execute(sql`SELECT to_regclass(${`${schema}.integration_credentials`}) AS name`);
    expect(absent.rows[0].name).toBeNull();
    vi.spyOn(db, "transaction").mockImplementation(async callback => callback(tx));
    vi.spyOn(db, "select").mockImplementation(tx.select.bind(tx));
    vi.spyOn(db, "insert").mockImplementation(tx.insert.bind(tx));
    vi.spyOn(db, "update").mockImplementation(tx.update.bind(tx));
    vi.spyOn(db, "delete").mockImplementation(tx.delete.bind(tx));
    try {
      await ensureCustomerCredentialSchema();
      await ensureCustomerCredentialSchema(); // Idempotent for subsequent deploys.
      const [company] = await tx.insert(companiesTable).values({
        name: "Prior schema upgrade", email: `${schema}@example.test`, passwordHash: "not-for-login", complimentaryTeamAccess: true,
      }).returning();
      const token = signToken({ companyId: company.id, userId: company.id, role: "admin", email: company.email, employeeId: null });
      const app = express(); app.use(express.json(), router);
      const direct = await request(app).post("/integrations/credentials").auth(token, { type: "bearer" })
        .send({ provider: "otter", apiKey: "migration-fake-key", consent: true });
      expect(direct.status).toBe(200);
      expect(await tx.select().from(integrationCredentialsTable)).toHaveLength(1);
      const broker = await request(app).post("/integrations/connect").auth(token, { type: "bearer" })
        .send({ category: "ats", provider: "lever" });
      expect(broker.status).toBe(200);
      const connections = await tx.select().from(integrationConnectionsTable).where(eq(integrationConnectionsTable.companyId, company.id));
      expect(connections.map(row => row.provider).sort()).toEqual(["lever", "otter"]);
      await tx.delete(integrationConnectionsTable).where(eq(integrationConnectionsTable.id, direct.body.connection.id));
      expect(await tx.select().from(integrationCredentialsTable)).toHaveLength(0);
    } finally {
      vi.restoreAllMocks();
      await tx.execute(sql.raw(`DROP SCHEMA "${schema}" CASCADE`));
    }
  });
});
