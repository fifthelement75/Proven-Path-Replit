import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { db, companiesTable, integrationConnectionsTable, integrationImportsTable, integrationRunsTable, employeesTable, candidateProfilesTable, feedbackTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { signToken } from "../middlewares/auth";
import exchangeRouter from "./integrationExchange";
import { executeExchangeAction } from "../lib/integrationActions";
import { verifyAccount } from "../lib/pipedreamConnect";

vi.mock("../lib/pipedreamConnect", async original => ({
  ...await original<typeof import("../lib/pipedreamConnect")>(),
  connectEnvironment: () => "development",
  verifyAccount: vi.fn(async () => ({ healthy: true })),
}));
vi.mock("../lib/integrationActions", async original => ({
  ...await original<typeof import("../lib/integrationActions")>(),
  getExchangeActions: vi.fn(async () => [
    { key: "read-fixture", name: "Read", write: false, props: [] },
    { key: "write-fixture", name: "Write", write: true, props: [{ name: "note", label: "Note", type: "string" }] },
  ]),
  executeExchangeAction: vi.fn(async () => [{ id: "remote-one", firstName: "Sample", lastName: "Employee", workEmail: "sample@example.test", jobTitle: "Engineer" }]),
}));

const app = express(); app.use(express.json()); app.use(exchangeRouter);
const ids: number[] = [], tokens: string[] = [];
let employeeId: number;
let connectionIds: number[] = [];
beforeAll(async () => {
  for (let i = 0; i < 2; i++) {
    const email = `exchange_test_${Date.now()}_${i}@example.test`;
    const [company] = await db.insert(companiesTable).values({
      name: "Exchange tests", email, passwordHash: "not-for-login", complimentaryTeamAccess: true,
    }).returning();
    ids.push(company.id);
    tokens.push(signToken({ companyId: company.id, userId: company.id, role: "admin", email, employeeId: null }));
  }
  const [employee] = await db.insert(employeesTable).values({
    companyId: ids[0], name: "Sample Employee", email: "sample@example.test", role: "Engineer",
    department: "Engineering", level: "Senior", startDate: "2025-01-01",
  }).returning();
  employeeId = employee.id;
});
beforeEach(async () => {
  vi.clearAllMocks();
  await db.delete(integrationImportsTable).where(inArray(integrationImportsTable.companyId, ids));
  await db.delete(integrationConnectionsTable).where(inArray(integrationConnectionsTable.companyId, ids));
  connectionIds = [];
  for (const companyId of ids) {
    const [connection] = await db.insert(integrationConnectionsTable).values({
      companyId, category: "hris", provider: "bamboohr", status: "connected",
      brokerAccountId: `apn_${companyId}`, brokerEnvironment: "development",
    }).returning();
    connectionIds.push(connection.id);
  }
});
afterAll(async () => {
  await db.delete(companiesTable).where(inArray(companiesTable.id, ids));
});
const auth = (method: "get" | "post", path: string, token = tokens[0]) =>
  request(app)[method](path).auth(token, { type: "bearer" });
const base = () => `/integrations/exchange/${connectionIds[0]}`;
const run = (extra = {}) => auth("post", `${base()}/run`).send({ requestId: crypto.randomUUID(), key: "read-fixture", props: {}, ...extra });

describe("customer integration data exchange", () => {
  it("requires an admin and scopes every operation to the company", async () => {
    expect((await request(app).get(base())).status).toBe(401);
    expect((await auth("get", base(), tokens[1])).status).toBe(404);
    const nonAdmin = signToken({ companyId: ids[0], userId: ids[0], role: "employee", email: "employee@example.test", employeeId: null });
    expect((await auth("get", base(), nonAdmin)).status).toBe(403);
    expect(verifyAccount).not.toHaveBeenCalled();
  });
  it("refuses an account from the wrong Connect environment", async () => {
    await db.update(integrationConnectionsTable).set({ brokerEnvironment: "production" }).where(eq(integrationConnectionsTable.id, connectionIds[0]));
    expect((await run()).status).toBe(409);
    expect(executeExchangeAction).not.toHaveBeenCalled();
  });
  it("validates action allowlists and never permits caller-supplied account credentials", async () => {
    expect((await run({ key: "delete-everything" })).status).toBe(400);
    expect((await run({ props: { authProvisionId: "another-account" } })).status).toBe(400);
    expect(executeExchangeAction).not.toHaveBeenCalled();
  });
  it("requires explicit write confirmation and preserves an uncertain outcome without auto retry", async () => {
    expect((await run({ key: "write-fixture", props: { note: "An approved assessment" } })).status).toBe(400);
    vi.mocked(executeExchangeAction).mockRejectedValueOnce(new Error("network failure"));
    const requestId = crypto.randomUUID();
    const body = { key: "write-fixture", props: { note: "An approved assessment" }, confirmWrite: true, requestId };
    expect((await auth("post", `${base()}/run`).send(body)).status).toBe(502);
    const retry = await auth("post", `${base()}/run`).send(body);
    expect(retry.body.run.status).toBe("needs_review");
    expect(executeExchangeAction).toHaveBeenCalledTimes(1);
  });
  it("stores successful reads, supports reload, and deduplicates repeated request IDs", async () => {
    const requestId = crypto.randomUUID();
    const first = await run({ requestId });
    expect(first.status).toBe(200);
    expect(first.body.rows[0].email).toBe("sample@example.test");
    const second = await run({ requestId });
    expect(second.body.run.id).toBe(first.body.run.id);
    expect(executeExchangeAction).toHaveBeenCalledTimes(1);
    const detail = await auth("get", `${base()}/runs/${first.body.run.id}`);
    expect(detail.body.rows).toHaveLength(1);
    expect((await auth("get", `${base()}/runs/${first.body.run.id}`, tokens[1])).status).toBe(404);
  });
  it("imports employee data only after review and does not duplicate it after reconnect", async () => {
    const first = await run();
    const body = { runId: first.body.run.id, index: 0, defaults: { department: "Engineering", level: "Senior", startDate: "2025-01-01" } };
    const imported = await auth("post", `${base()}/import`).send(body);
    expect(imported.status).toBe(200);
    expect(imported.body.localId).toBe(employeeId);
    expect((await auth("post", `${base()}/import`).send(body)).body.alreadyImported).toBe(true);
    await db.delete(integrationConnectionsTable).where(eq(integrationConnectionsTable.id, connectionIds[0]));
    const [replacement] = await db.insert(integrationConnectionsTable).values({
      companyId: ids[0], category: "hris", provider: "bamboohr", brokerAccountId: "apn_reconnected", brokerEnvironment: "development",
    }).returning();
    connectionIds[0] = replacement.id;
    const reloaded = await run();
    const result = await auth("post", `${base()}/import`).send({ ...body, runId: reloaded.body.run.id });
    expect(result.body.alreadyImported).toBe(true);
  });
  it("refuses incomplete HRIS data rather than inventing missing fields", async () => {
    const first = await run();
    const result = await auth("post", `${base()}/import`).send({ runId: first.body.run.id, index: 0 });
    expect(result.status).toBe(422);
    expect(result.body.message).toMatch(/department/);
  });
  it("updates a previously imported source record when reviewed source data changes", async () => {
    const defaults = { department: "Engineering", level: "Senior", startDate: "2025-01-01" };
    const first = await run();
    await auth("post", `${base()}/import`).send({ runId: first.body.run.id, index: 0, defaults });
    vi.mocked(executeExchangeAction).mockResolvedValueOnce([{
      id: "remote-one", firstName: "Sample", lastName: "Employee", workEmail: "sample@example.test", jobTitle: "Staff Engineer",
    }]);
    const next = await run();
    const result = await auth("post", `${base()}/import`).send({ runId: next.body.run.id, index: 0, defaults });
    expect(result.status).toBe(200);
    expect(result.body.localId).toBe(employeeId);
    expect(result.body.alreadyImported).toBe(false);
    const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, employeeId));
    expect(employee.role).toBe("Staff Engineer");
    expect(employee.userRole).toBe("employee");
  });
  it("imports candidates into the right company with a required application role", async () => {
    await db.update(integrationConnectionsTable).set({ category: "ats", provider: "ashby" }).where(eq(integrationConnectionsTable.id, connectionIds[0]));
    const first = await run();
    const result = await auth("post", `${base()}/import`).send({ runId: first.body.run.id, index: 0, defaults: { role: "Software Engineer" } });
    expect(result.status).toBe(200);
    const [candidate] = await db.select().from(candidateProfilesTable).where(eq(candidateProfilesTable.id, result.body.localId));
    expect(candidate.companyId).toBe(ids[0]);
    expect(candidate.roleApplyingFor).toBe("Software Engineer");
  });
  it("imports meeting summaries into employee feedback and rejects a foreign employee", async () => {
    await db.update(integrationConnectionsTable).set({ category: "meeting", provider: "granola" }).where(eq(integrationConnectionsTable.id, connectionIds[0]));
    vi.mocked(executeExchangeAction).mockResolvedValueOnce({ id: "meeting-one", title: "Coaching", summary: "Discussed next quarter." } as any);
    const first = await run();
    const [foreign] = await db.insert(employeesTable).values({ companyId: ids[1], name: "Other company", email: "foreign@example.test", role: "Engineer", department: "Engineering", level: "Senior", startDate: "2025-01-01" }).returning();
    const body = { runId: first.body.run.id, index: 0, employeeId: foreign.id, defaults: { meetingDate: "2026-10-24" } };
    expect((await auth("post", `${base()}/import`).send(body)).status).toBe(404);
    const result = await auth("post", `${base()}/import`).send({ ...body, employeeId });
    expect(result.status).toBe(200);
    const [feedback] = await db.select().from(feedbackTable).where(eq(feedbackTable.id, result.body.localId));
    expect(feedback.employeeId).toBe(employeeId);
    expect(feedback.nextSteps).toContain("Discussed next quarter.");
  });
  it("imports real Fireflies fields once under concurrent retries, updates changes and survives reconnect", async () => {
    await db.update(integrationConnectionsTable).set({ category: "meeting", provider: "fireflies" })
      .where(eq(integrationConnectionsTable.id, connectionIds[0]));
    const source = { data: { transcripts: [{ id: "fireflies-source", title: "Coaching", date: 1793836800000,
      summary: { overview: "Discussed growth.", action_items: "Draft the plan." } }] } };
    vi.mocked(executeExchangeAction).mockResolvedValueOnce(source as any);
    const first = await run();
    const body = { runId: first.body.run.id, index: 0, employeeId };
    const results = await Promise.all([
      auth("post", `${base()}/import`).send(body), auth("post", `${base()}/import`).send(body),
    ]);
    expect(results.map(r => r.status)).toEqual([200, 200]);
    expect(results[0].body.localId).toBe(results[1].body.localId);
    expect(results.filter(r => r.body.alreadyImported)).toHaveLength(1);
    const localId = results[0].body.localId;
    const [note] = await db.select().from(feedbackTable).where(eq(feedbackTable.id, localId));
    expect(note.employeeId).toBe(employeeId);
    expect(note.meetingDate).toBe("2026-11-05");
    expect(note.actionItems).toBe("Draft the plan.");
    expect(note.nextSteps).toContain("Discussed growth.");
    const [otherEmployee] = await db.insert(employeesTable).values({
      companyId: ids[0], name: "Different employee", email: `other-${localId}@example.test`,
      role: "Engineer", department: "Engineering", level: "Senior", startDate: "2025-01-01",
    }).returning();
    expect((await auth("post", `${base()}/import`).send({ ...body, employeeId: otherEmployee.id })).status).toBe(409);
    await db.delete(integrationConnectionsTable).where(eq(integrationConnectionsTable.id, connectionIds[0]));
    const [replacement] = await db.insert(integrationConnectionsTable).values({
      companyId: ids[0], category: "meeting", provider: "fireflies",
      brokerAccountId: "apn_reconnected", brokerEnvironment: "development",
    }).returning();
    connectionIds[0] = replacement.id;
    vi.mocked(executeExchangeAction).mockResolvedValueOnce(source as any);
    const reloaded = await run();
    const repeated = await auth("post", `${base()}/import`).send({ ...body, runId: reloaded.body.run.id });
    expect(repeated.body).toEqual({ localId, alreadyImported: true });
    source.data.transcripts[0].summary = { overview: "Updated discussion.", action_items: "" };
    vi.mocked(executeExchangeAction).mockResolvedValueOnce(source as any);
    const changed = await run();
    const updated = await auth("post", `${base()}/import`).send({ ...body, runId: changed.body.run.id });
    expect(updated.body).toEqual({ localId, alreadyImported: false });
    const [revised] = await db.select().from(feedbackTable).where(eq(feedbackTable.id, localId));
    expect(revised.actionItems).toBeNull();
    expect(revised.nextSteps).toContain("Updated discussion.");
  });
  it("refuses imports from a configured-only meeting provider", async () => {
    await db.update(integrationConnectionsTable).set({
      category: "meeting", provider: "fireflies", brokerAccountId: null,
    }).where(eq(integrationConnectionsTable.id, connectionIds[0]));
    expect((await run()).status).toBe(409);
    expect((await auth("post", `${base()}/import`).send({ runId: 1, index: 0, employeeId })).status).toBe(409);
    expect(executeExchangeAction).not.toHaveBeenCalled();
  });
  it("does not fabricate a meeting date for an undated source record", async () => {
    await db.update(integrationConnectionsTable).set({ category: "meeting", provider: "fireflies" })
      .where(eq(integrationConnectionsTable.id, connectionIds[0]));
    vi.mocked(executeExchangeAction).mockResolvedValueOnce({
      data: { transcript: { id: "undated", summary: { overview: "A source note." } } },
    } as any);
    const first = await run();
    const body = { runId: first.body.run.id, index: 0, employeeId };
    expect((await auth("post", `${base()}/import`).send(body)).status).toBe(422);
    expect((await auth("post", `${base()}/import`).send({ ...body, defaults: { meetingDate: "2026-02-30" } })).status).toBe(422);
    expect((await auth("post", `${base()}/import`).send({ ...body, defaults: { meetingDate: "2026-11-05" } })).status).toBe(200);
  });
});
