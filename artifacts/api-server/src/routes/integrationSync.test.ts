import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { and, eq, inArray } from "drizzle-orm";
import { db, companiesTable, employeesTable, candidateProfilesTable, integrationConnectionsTable as connections, integrationSyncTable as syncs,
  integrationImportsTable as imports, integrationRunsTable as runs, integrationSyncWritesTable as writes } from "@workspace/db";
import { ensureIntegrationSyncSchema } from "../lib/ensureIntegrationSyncSchema";
import { signToken } from "../middlewares/auth";
import router from "./integrationSync";
import { runSync } from "../lib/integrationSync";
import { getExchangeActions, executeExchangeAction } from "../lib/integrationActions";
import { verifyAccount, IntegrationError } from "../lib/pipedreamConnect";
import type { SyncConfig } from "../lib/integrationSyncPolicy";

vi.mock("../lib/pipedreamConnect", async original => ({
  ...await original<typeof import("../lib/pipedreamConnect")>(),
  connectEnvironment: () => "development", verifyAccount: vi.fn(async () => ({ healthy: true })),
}));
vi.mock("../lib/integrationActions", async original => ({
  ...await original<typeof import("../lib/integrationActions")>(),
  getExchangeActions: vi.fn(async () => [
    { key: "read", name: "Read", write: false, props: [{ name: "page", type: "integer", optional: true }, { name: "since", type: "string", optional: true }] },
    { key: "bamboohr-update-employee", name: "Write", write: true, props: [{ name: "jobTitle", type: "string" }, { name: "employeeId", type: "string" }] },
    ...["greenhouse-create-candidate", "ashby-create-candidate", "lever-add-note"].map(key => ({
      key, name: key, write: true, props: [{ name: "name", type: "string" }],
    })),
  ]),
  executeExchangeAction: vi.fn(),
}));
const app = express(); app.use(express.json()); app.use((req, _res, next) => { req.log = { warn: vi.fn() } as any; next(); }); app.use(router);
const ids: number[] = [], tokens: string[] = [];
let connectionId: number;
const config: SyncConfig = {
  actionKey: "read", props: {}, intervalMinutes: 15, pagination: { mode: "single" },
  fields: Object.fromEntries(["name", "email", "role", "department", "level", "startDate"].map(f => [f, { source: `$${f}`, owner: "provider" as const }])),
};
const sample = { id: "one", name: "Employee", email: "auto@example.test", role: "Engineer",
  department: "Engineering", level: "Senior", startDate: "2025-01-01" };
beforeAll(async () => {
  await ensureIntegrationSyncSchema();
  for (let i = 0; i < 2; i++) {
    const email = `sync_${Date.now()}_${i}@example.test`;
    const [company] = await db.insert(companiesTable).values({ name: "Sync test", email, passwordHash: "test", complimentaryTeamAccess: true }).returning();
    ids.push(company.id); tokens.push(signToken({ companyId: company.id, userId: company.id, email, role: "admin", employeeId: null }));
  }
});
beforeEach(async () => {
  vi.clearAllMocks();
  vi.mocked(verifyAccount).mockResolvedValue({ healthy: true } as any);
  vi.mocked(executeExchangeAction).mockResolvedValue([sample]);
  await db.delete(connections).where(inArray(connections.companyId, ids));
  await db.delete(imports).where(inArray(imports.companyId, ids));
  await db.delete(writes).where(inArray(writes.companyId, ids));
  await db.delete(employeesTable).where(inArray(employeesTable.companyId, ids));
  await db.delete(candidateProfilesTable).where(inArray(candidateProfilesTable.companyId, ids));
  const [c] = await db.insert(connections).values({ companyId: ids[0], category: "hris", provider: "bamboohr", status: "connected", brokerAccountId: "account", brokerEnvironment: "development" }).returning();
  connectionId = c.id;
});
afterAll(async () => {
  await db.delete(connections).where(inArray(connections.companyId, ids));
  await db.delete(companiesTable).where(inArray(companiesTable.id, ids));
});
const post = (body: any, token = tokens[0]) => request(app).post(`/integrations/sync/${connectionId}`).auth(token, { type: "bearer" }).send(body);
async function enable(c = config) {
  const preview = await post({ command: "preview", config: c });
  expect(preview.status).toBe(200);
  const approved = await post({ command: "approve", previewId: preview.body.previewId, confirmOutbound: !!c.outbound });
  expect(approved.status).toBe(200);
}
describe("company-isolated automatic exchange", () => {
  it("requires admin approval, scopes every operation to company, and never accepts meetings", async () => {
    expect((await post({ command: "preview", config }, tokens[1])).status).toBe(404);
    expect((await post({ command: "approve", previewId: "unreviewed" })).status).toBe(409);
    const employeeToken = signToken({ companyId: ids[0], userId: 123, role: "employee", employeeId: null, email: "test@example.test" });
    expect((await post({ command: "disable" }, employeeToken)).status).toBe(403);
    expect((await db.select().from(syncs).where(eq(syncs.connectionId, connectionId))).length).toBe(0);
  });
  it("imports then updates changed records, reports local conflicts, and deduplicates reconnects", async () => {
    await enable(); await runSync(ids[0], connectionId);
    vi.mocked(executeExchangeAction).mockResolvedValue([{ ...sample, role: "Staff" }]);
    await runSync(ids[0], connectionId);
    let employees = await db.select().from(employeesTable).where(eq(employeesTable.companyId, ids[0]));
    expect(employees).toHaveLength(1); expect(employees[0].role).toBe("Staff");
    await db.update(employeesTable).set({ role: "Local edit" }).where(eq(employeesTable.id, employees[0].id));
    await runSync(ids[0], connectionId);
    const status = await request(app).get(`/integrations/sync/${connectionId}`).auth(tokens[0], { type: "bearer" });
    expect(status.body.issues[0].message).toContain("conflict");
    await db.delete(connections).where(eq(connections.id, connectionId));
    const [reconnected] = await db.insert(connections).values({ companyId: ids[0], category: "hris", provider: "bamboohr",
      status: "connected", brokerAccountId: "new-account", brokerEnvironment: "development" }).returning();
    connectionId = reconnected.id;
    await db.update(employeesTable).set({ role: "Staff" }).where(eq(employeesTable.id, employees[0].id));
    await enable(); await runSync(ids[0], connectionId);
    employees = await db.select().from(employeesTable).where(eq(employeesTable.companyId, ids[0]));
    expect(employees).toHaveLength(1);
    expect(await db.select().from(imports).where(eq(imports.companyId, ids[0]))).toHaveLength(1);
  }, 15000);
  it("commits successful records during partial failure and stops reads on disable or revocation", async () => {
    vi.mocked(executeExchangeAction).mockResolvedValue([sample, { ...sample, id: "invalid", email: "invalid" }]);
    await enable(); await runSync(ids[0], connectionId);
    const [run] = await db.select().from(runs).where(and(eq(runs.connectionId, connectionId), eq(runs.actionKey, "automatic-sync")));
    expect(run.status).toBe("partial");
    expect(await db.select().from(employeesTable).where(eq(employeesTable.companyId, ids[0]))).toHaveLength(1);
    await post({ command: "disable" });
    vi.mocked(executeExchangeAction).mockClear();
    await runSync(ids[0], connectionId); expect(executeExchangeAction).not.toHaveBeenCalled();
    await enable();
    vi.mocked(verifyAccount).mockRejectedValue(new IntegrationError(403, "Revoked"));
    vi.mocked(executeExchangeAction).mockClear();
    await runSync(ids[0], connectionId);
    const [sync] = await db.select().from(syncs).where(eq(syncs.connectionId, connectionId));
    expect(sync.enabled).toBe(false); expect(sync.nextSyncAt).toBeNull(); expect(executeExchangeAction).not.toHaveBeenCalled();
  }, 15000);
  it("updates ATS candidates by stable identity without requiring email", async () => {
    await db.update(connections).set({ category: "ats", provider: "lever" }).where(eq(connections.id, connectionId));
    vi.mocked(executeExchangeAction).mockResolvedValue([{ id: "candidate-one", name: "Candidate", role: "Engineer" }]);
    const ats: SyncConfig = { ...config, fields: { name: { source: "$name", owner: "provider" }, role: { source: "$role", owner: "provider" } } };
    await enable(ats); await runSync(ids[0], connectionId);
    vi.mocked(executeExchangeAction).mockResolvedValue([{ id: "candidate-one", name: "Candidate changed", role: "Staff" }]);
    await runSync(ids[0], connectionId);
    const candidates = await db.select().from(candidateProfilesTable).where(eq(candidateProfilesTable.companyId, ids[0]));
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ name: "Candidate changed", roleApplyingFor: "Staff", email: null });
    expect(await db.select().from(candidateProfilesTable).where(eq(candidateProfilesTable.companyId, ids[1]))).toHaveLength(0);
  });
  it("checkpoints successful pages, resumes after read failure and uses incremental high-water inputs", async () => {
    const incremental: SyncConfig = { ...config, pagination: { mode: "page", prop: "page", pageSize: 1 }, updatedAtPath: "updated_at", updatedSinceProp: "since" };
    const dated = { ...sample, updated_at: "2025-02-02T00:00:00Z" };
    vi.mocked(executeExchangeAction).mockResolvedValue([dated]);
    await enable(incremental);
    vi.mocked(executeExchangeAction).mockImplementation(async (_company, _account, _action, props) => {
      if (props.page === 2) throw new IntegrationError(400, "Bad page"); return [dated];
    });
    await runSync(ids[0], connectionId);
    let [sync] = await db.select().from(syncs).where(eq(syncs.connectionId, connectionId));
    expect(sync.cursor.page).toBe(2);
    expect(sync.cursor.watermark).toBeUndefined();
    vi.mocked(executeExchangeAction).mockResolvedValue([]);
    await runSync(ids[0], connectionId);
    [sync] = await db.select().from(syncs).where(eq(syncs.connectionId, connectionId));
    expect(sync.cursor.page).toBeUndefined();
    expect(sync.cursor.watermark).toBe(Date.parse(dated.updated_at));
    vi.mocked(executeExchangeAction).mockClear();
    await runSync(ids[0], connectionId);
    expect(vi.mocked(executeExchangeAction).mock.calls[0][3]).toMatchObject({ page: 1, since: dated.updated_at.replace("Z", ".000Z") });
  });
  it("disabling while a provider read is in flight prevents its result from changing local records", async () => {
    await enable();
    let release!: (value: unknown) => void;
    let started!: () => void;
    const pending = new Promise<any>(resolve => { release = resolve; });
    const readStarted = new Promise<void>(resolve => { started = resolve; });
    vi.mocked(executeExchangeAction).mockImplementation(async () => { started(); return pending; });
    const worker = runSync(ids[0], connectionId);
    await readStarted;
    expect((await post({ command: "disable" })).status).toBe(200);
    release([sample]); await worker;
    expect(await db.select().from(employeesTable).where(eq(employeesTable.companyId, ids[0]))).toHaveLength(0);
  });
  it("does not run two workers concurrently for one connection, and stops after account replacement", async () => {
    await enable();
    vi.mocked(executeExchangeAction).mockClear();
    await Promise.all([runSync(ids[0], connectionId), runSync(ids[0], connectionId)]);
    expect(executeExchangeAction).toHaveBeenCalledTimes(1);
    await db.update(connections).set({ brokerAccountId: "replaced-account" }).where(eq(connections.id, connectionId));
    vi.mocked(executeExchangeAction).mockClear();
    await runSync(ids[0], connectionId);
    const [sync] = await db.select().from(syncs).where(eq(syncs.connectionId, connectionId));
    expect(sync.enabled).toBe(false);
    expect(executeExchangeAction).not.toHaveBeenCalled();
  });
  it("requires separate outbound approval, persists uncertain writes, and never automatically resends them", async () => {
    const outbound: SyncConfig = { ...config, fields: { ...config.fields, role: { source: "$role", owner: "local" } },
      outbound: { actionKey: "bamboohr-update-employee", props: {}, fields: { jobTitle: "role", employeeId: "remoteId" } } };
    // Start from a reviewed local identity, since local-owned required fields
    // cannot be fabricated when automatically creating a new employee.
    await enable(); await runSync(ids[0], connectionId);
    const preview = await post({ command: "preview", config: outbound });
    expect(preview.status).toBe(200);
    expect((await post({ command: "approve", previewId: preview.body.previewId })).status).toBe(400);
    expect((await post({ command: "approve", previewId: preview.body.previewId, confirmOutbound: true })).status).toBe(200);
    vi.mocked(executeExchangeAction).mockImplementation(async (_company, _account, action) => {
      if (action.write) throw new IntegrationError(502, "unknown"); return [sample];
    });
    await runSync(ids[0], connectionId); await runSync(ids[0], connectionId);
    const ledger = await db.select().from(writes).where(eq(writes.companyId, ids[0]));
    expect(ledger).toHaveLength(1); expect(ledger[0].status).toBe("needs_review");
    expect(vi.mocked(executeExchangeAction).mock.calls.filter(c => c[2].write)).toHaveLength(1);
    expect((await post({ command: "reconcile", writeId: ledger[0].id, resolution: "applied" }, tokens[1])).status).toBe(404);
    expect((await post({ command: "reconcile", writeId: ledger[0].id, resolution: "not_applied" })).status).toBe(200);
    await runSync(ids[0], connectionId);
    expect(vi.mocked(executeExchangeAction).mock.calls.filter(c => c[2].write)).toHaveLength(1);
  }, 20000);
  it.each([
    ["greenhouse", "greenhouse-create-candidate"],
    ["ashby", "ashby-create-candidate"],
    ["lever", "lever-add-note"],
  ])("never schedules %s create/append operations, including stored approvals after subsequent local edits", async (provider, actionKey) => {
    await db.update(connections).set({ category: "ats", provider }).where(eq(connections.id, connectionId));
    const ats: SyncConfig = { ...config, fields: { name: { source: "$name", owner: "provider" }, role: { source: "$role", owner: "provider" } } };
    await enable(ats); await runSync(ids[0], connectionId);
    const unsafe: SyncConfig = { ...ats, fields: { ...ats.fields, role: { source: "$role", owner: "local" } },
      outbound: { actionKey, props: {}, fields: { name: "role" } } };
    expect((await post({ command: "preview", config: unsafe })).status).toBe(400);
    // Simulate an approval saved by a previous version of the worker.
    await db.update(syncs).set({ config: unsafe as any }).where(eq(syncs.connectionId, connectionId));
    vi.mocked(executeExchangeAction).mockClear();
    await runSync(ids[0], connectionId);
    await db.update(candidateProfilesTable).set({ roleApplyingFor: "A later local edit" }).where(eq(candidateProfilesTable.companyId, ids[0]));
    await runSync(ids[0], connectionId);
    expect(vi.mocked(executeExchangeAction).mock.calls.filter(c => c[2].write)).toHaveLength(0);
    expect(await db.select().from(writes).where(eq(writes.companyId, ids[0]))).toHaveLength(0);
    expect(await db.select().from(candidateProfilesTable).where(eq(candidateProfilesTable.companyId, ids[0]))).toHaveLength(1);
  });
  it("requires stable remote targeting and dispatches later local edits only as updates to that same record", async () => {
    await enable(); await runSync(ids[0], connectionId);
    const update: SyncConfig = { ...config, fields: { ...config.fields, role: { source: "$role", owner: "local" } },
      outbound: { actionKey: "bamboohr-update-employee", props: {}, fields: { employeeId: "remoteId", jobTitle: "role" } } };
    expect((await post({ command: "preview", config: { ...update, outbound: { ...update.outbound, fields: { jobTitle: "role" } } } })).status).toBe(400);
    await enable(update);
    vi.mocked(executeExchangeAction).mockImplementation(async (_company, _account, action) => action.write ? { success: true } : [sample]);
    await runSync(ids[0], connectionId);
    await db.update(employeesTable).set({ role: "Staff" }).where(eq(employeesTable.companyId, ids[0]));
    await runSync(ids[0], connectionId);
    const updates = vi.mocked(executeExchangeAction).mock.calls.filter(c => c[2].write);
    expect(updates).toHaveLength(2);
    expect(updates.map(call => [call[2].key, call[3]])).toEqual([
      ["bamboohr-update-employee", { employeeId: "one", jobTitle: "Engineer" }],
      ["bamboohr-update-employee", { employeeId: "one", jobTitle: "Staff" }],
    ]);
  });
});
