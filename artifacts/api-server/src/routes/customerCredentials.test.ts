import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import crypto from "node:crypto";
import { db, companiesTable, integrationConnectionsTable, integrationCredentialsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { signToken } from "../middlewares/auth";
import router from "./integrations";
import exchange from "./integrationExchange";
import { sealCredential, openCredential, executeCustomerRead } from "../lib/customerCredentials";

const app = express(); app.use(express.json(), router, exchange);
const ids: number[] = [], tokens: string[] = [];
const fakeKey = "test-customer-key-not-real";
const fakePassword = "test-api-password-not-real";
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
let fetcher: ReturnType<typeof vi.fn>;
beforeAll(async () => {
  vi.stubEnv("SESSION_SECRET", "integration-test-only-session-secret-at-least-32-chars");
  vi.stubEnv("PIPEDREAM_ENVIRONMENT", "development");
  for (let n = 0; n < 2; n++) {
    const email = `customer_adapter_${crypto.randomUUID()}@example.test`;
    const [company] = await db.insert(companiesTable).values({ name: "Adapter tests", email, passwordHash: "not-for-login", complimentaryTeamAccess: true }).returning();
    ids.push(company.id);
    tokens.push(signToken({ companyId: company.id, userId: company.id, role: "admin", email, employeeId: null }));
  }
});
beforeEach(async () => {
  await db.delete(integrationConnectionsTable).where(inArray(integrationConnectionsTable.companyId, ids));
  fetcher = vi.fn(async (url: string) => response(url.includes("api.otter.ai") ? { data: [] } : { searchResults: [] }));
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => vi.unstubAllGlobals());
afterAll(async () => { await db.delete(companiesTable).where(inArray(companiesTable.id, ids)); vi.unstubAllEnvs(); });
const post = (path: string, data: object, token = tokens[0]) => request(app).post(path).auth(token, { type: "bearer" }).send(data);
const save = (extra = {}) => post("/integrations/credentials", { provider: "otter", apiKey: fakeKey, consent: true, ...extra });

describe("company-specific Otter and iCIMS credentials", () => {
  it("encrypts credentials and binds decryption to the company/provider/environment/connection", () => {
    const envelope = sealCredential({ apiKey: fakeKey }, "company1:otter:development:1");
    expect(envelope).not.toContain(fakeKey);
    expect(openCredential(envelope, "company1:otter:development:1")).toEqual({ apiKey: fakeKey });
    expect(() => openCredential(envelope, "company2:otter:development:1")).toThrow();
    expect(() => openCredential(envelope, "company1:icims:development:1")).toThrow();
    expect(() => openCredential(envelope, "company1:otter:production:1")).toThrow();
    expect(() => openCredential(envelope, "company1:otter:development:2")).toThrow();
    const parts = envelope.split("."); parts[2] = Buffer.alloc(16).toString("base64url");
    expect(() => openCredential(parts.join("."), "company1:otter:development:1")).toThrow();
  });
  it("requires an authenticated company admin, supported provider and explicit consent", async () => {
    expect((await request(app).post("/integrations/credentials").send({})).status).toBe(401);
    const employee = signToken({ companyId: ids[0], userId: ids[0], role: "employee", email: "employee@example.test", employeeId: null });
    expect((await post("/integrations/credentials", {}, employee)).status).toBe(403);
    expect((await save({ consent: false })).status).toBe(400);
    expect((await save({ provider: "unknown" })).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("checks the real Otter endpoint before saving and never returns credentials or ciphertext", async () => {
    const result = await save();
    expect(result.status).toBe(200);
    expect(fetcher.mock.calls[0][0]).toBe("https://api.otter.ai/v1/conversations?limit=1");
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${fakeKey}`);
    expect(fetcher.mock.calls[0][1].redirect).toBe("error");
    const [stored] = await db.select().from(integrationCredentialsTable).where(eq(integrationCredentialsTable.companyId, ids[0]));
    expect(stored.encryptedCredential).not.toContain(fakeKey);
    const list = await request(app).get("/integrations").auth(tokens[0], { type: "bearer" });
    expect(list.body.connections[0].status).toBe("connected");
    for (const body of [list.body, result.body]) {
      expect(JSON.stringify(body)).not.toContain(fakeKey);
      expect(JSON.stringify(body)).not.toContain(stored.encryptedCredential);
    }
  });
  it.each([401,403,404,429,500])("does not save unsupported or invalid accounts (provider HTTP %i)", async status => {
    fetcher.mockResolvedValueOnce(response({ error: fakeKey }, status));
    const result = await save();
    expect(result.status).not.toBe(200);
    expect(JSON.stringify(result.body)).not.toContain(fakeKey);
    expect(await db.select().from(integrationCredentialsTable).where(eq(integrationCredentialsTable.companyId, ids[0]))).toHaveLength(0);
    expect(await db.select().from(integrationConnectionsTable).where(eq(integrationConnectionsTable.companyId, ids[0]))).toHaveLength(0);
  });
  it("rejects HTML/login pages and unsupported API response shapes", async () => {
    fetcher.mockResolvedValueOnce(new Response("<html>Login</html>"));
    expect((await save()).status).toBe(502);
    fetcher.mockResolvedValueOnce(response({ success: true }));
    expect((await save()).status).toBe(422);
  });
  it("does not replace working credentials when reauthorization fails", async () => {
    await save();
    const [before] = await db.select().from(integrationCredentialsTable).where(eq(integrationCredentialsTable.companyId, ids[0]));
    fetcher.mockResolvedValueOnce(response({}, 401));
    expect((await save({ apiKey: "replacement-not-real" })).status).toBe(409);
    const [after] = await db.select().from(integrationCredentialsTable).where(eq(integrationCredentialsTable.companyId, ids[0]));
    expect(after.encryptedCredential).toBe(before.encryptedCredential);
  });
  it("refuses cross-company and wrong-environment credentials before contacting the provider", async () => {
    const saved = await save(); fetcher.mockClear();
    const id = saved.body.connection.id, account = `direct:${id}`;
    await expect(executeCustomerRead(ids[1], "otter", account, "otter-list-conversations", {})).rejects.toMatchObject({ status: 404 });
    expect((await request(app).get(`/integrations/exchange/${id}`).auth(tokens[1], { type: "bearer" })).status).toBe(404);
    await db.update(integrationCredentialsTable).set({ environment: "production" }).where(eq(integrationCredentialsTable.connectionId, id));
    await expect(executeCustomerRead(ids[0], "otter", account, "otter-list-conversations", {})).rejects.toMatchObject({ status: 404 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("detects revoked credentials in connection status and blocks exchange", async () => {
    const saved = await save();
    fetcher.mockImplementation(async () => response({}, 401));
    const list = await request(app).get("/integrations").auth(tokens[0], { type: "bearer" });
    expect(list.body.connections[0].status).toBe("needs_authorization");
    expect((await request(app).get(`/integrations/exchange/${saved.body.connection.id}`).auth(tokens[0], { type: "bearer" })).status).toBe(409);
  });
  it("removes credentials on disconnect even when the vendor key is already revoked", async () => {
    const saved = await save(); fetcher.mockClear();
    expect((await post("/integrations/disconnect", { category: "meeting", provider: "otter" })).status).toBe(200);
    expect(await db.select().from(integrationCredentialsTable).where(eq(integrationCredentialsTable.connectionId, saved.body.connection.id))).toHaveLength(0);
    await expect(executeCustomerRead(ids[0], "otter", saved.body.connection.brokerAccountId, "otter-list-conversations", {})).rejects.toMatchObject({ status: 404 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("retains multiple meeting providers and one ATS provider", async () => {
    await db.insert(integrationConnectionsTable).values({ companyId: ids[0], category: "meeting", provider: "fireflies" });
    expect((await save()).status).toBe(200);
    expect((await save()).status).toBe(200);
    expect(await db.select().from(integrationConnectionsTable).where(eq(integrationConnectionsTable.companyId, ids[0]))).toHaveLength(2);
    await db.insert(integrationConnectionsTable).values({ companyId: ids[0], category: "ats", provider: "lever" });
    const result = await save({ provider: "icims", apiKey: undefined, customerId: "1234", username: "integration", password: fakePassword });
    expect(result.status).toBe(409);
  });
  it("uses provisioned iCIMS credentials and a fixed customer-scoped API host", async () => {
    const result = await save({ provider: "icims", apiKey: undefined, customerId: "1234", username: "integration", password: fakePassword });
    expect(result.status).toBe(200);
    expect(fetcher.mock.calls[0][0]).toContain("https://api.icims.com/customers/1234/search/people?");
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe(`Basic ${Buffer.from(`integration:${fakePassword}`).toString("base64")}`);
    const person = await executeCustomerRead(ids[0], "icims", result.body.connection.brokerAccountId, "icims-get-person", { profileId: 42 });
    expect(person.id).toBe("icims:1234:people:42");
    expect(fetcher.mock.calls[1][0]).toBe("https://api.icims.com/customers/1234/people/42");
    expect((await save({ provider: "icims", customerId: "../other", apiKey: undefined, username: "integration", password: fakePassword })).status).toBe(400);
    expect((await save({ provider: "icims", apiKey: undefined, customerId: "1234", username: "integration" })).status).toBe(400);
  });
  it("executes allowlisted reads through the existing reviewed exchange and refuses write/account injection", async () => {
    const saved = await save(), base = `/integrations/exchange/${saved.body.connection.id}`;
    const operation = { requestId: crypto.randomUUID(), key: "otter-list-conversations", props: {} };
    const result = await post(`${base}/run`, operation);
    expect(result.status).toBe(200);
    expect(result.body.run.status).toBe("succeeded");
    expect(fetcher.mock.calls.at(-1)?.[0]).toBe("https://api.otter.ai/v1/conversations?limit=20");
    expect((await post(`${base}/run`, { ...operation, requestId: crypto.randomUUID(), key: "otter-delete-conversation" })).status).toBe(400);
    expect((await post(`${base}/run`, { ...operation, requestId: crypto.randomUUID(), props: { accountId: "direct:another-company" } })).status).toBe(400);
    await expect(executeCustomerRead(ids[0], "otter", saved.body.connection.brokerAccountId, "otter-get-conversation", { conversationId: "../../private" })).rejects.toMatchObject({ status: 400 });
  });
});
