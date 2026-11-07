import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createCipheriv, hkdfSync, randomBytes, randomUUID } from "node:crypto";
import { db, companiesTable, integrationConnectionsTable, integrationCredentialsTable as credentials } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ensureCustomerCredentialSchema } from "./ensureCustomerCredentialSchema";
import { credentialContext, openCredential, sealCredential } from "./customerCredentialCrypto";
import {
  getCustomerCredentialReadiness,
  logCustomerCredentialReadiness,
  rotateCustomerCredentials,
} from "./customerCredentialRotation";
import { logger } from "./logger";

const old = Buffer.alloc(32, 3).toString("base64"), next = Buffer.alloc(32, 4).toString("base64");
const legacy = "test-legacy-original-session-secret-over-32-characters";
let companyId: number;
function configure(active = "old", keys = { old, next } as Record<string, string>) {
  vi.stubEnv("CUSTOMER_CREDENTIAL_KEYS", JSON.stringify(keys));
  vi.stubEnv("CUSTOMER_CREDENTIAL_ACTIVE_KEY_ID", active);
  vi.stubEnv("CUSTOMER_CREDENTIAL_LEGACY_SECRET", legacy);
}
async function insert(version: "v1" | "v2", environment = "development") {
  const provider = `rotation-fixture-${randomUUID()}`;
  const [connection] = await db.insert(integrationConnectionsTable).values({ companyId, provider, category: "meeting" }).returning();
  const aad = credentialContext(companyId, provider, environment, connection.id);
  const value = { apiKey: "fake-test-only" };
  let encryptedCredential = sealCredential(value, aad);
  if (version === "v1") {
    const key = Buffer.from(hkdfSync("sha256", legacy, "provenpath.customer-credentials.v1", aad, 32));
    const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(Buffer.from(aad));
    const data = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
    encryptedCredential = ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
  }
  const [row] = await db.insert(credentials).values({ connectionId: connection.id, companyId, provider, environment, encryptedCredential }).returning();
  return row;
}
const rows = () => db.select().from(credentials).where(eq(credentials.companyId, companyId));
beforeAll(async () => {
  await ensureCustomerCredentialSchema();
  const [company] = await db.insert(companiesTable).values({
    name: "Rotation tests", email: `${randomUUID()}@example.test`, passwordHash: "not-for-login",
  }).returning();
  companyId = company.id;
});
beforeEach(async () => {
  configure();
  await db.delete(integrationConnectionsTable).where(eq(integrationConnectionsTable.companyId, companyId));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
afterAll(async () => { await db.delete(companiesTable).where(eq(companiesTable.id, companyId)); });
const rotate = (options: Omit<Parameters<typeof rotateCustomerCredentials>[0], "companyId" | "environment"> = {}) =>
  rotateCustomerCredentials({ environment: "development", companyId, ...options });

it("reports redacted aggregate readiness for missing historical and legacy keys", async () => {
  const historical = await insert("v2");
  await insert("v1");
  await insert("v2", "production");

  const ready = await getCustomerCredentialReadiness({ environment: "development", companyId });
  expect(ready).toMatchObject({
    status: "ready",
    configurationCategory: null,
    counts: {
      total: 2,
      legacyV1: 1,
      version2: 1,
      missingHistoricalKey: 0,
      unverifiableVersion2: 0,
      legacyKeyUnavailable: 0,
      unrecognizedEnvelope: 0,
    },
  });
  expect(JSON.stringify(ready)).not.toContain(historical.encryptedCredential);
  expect(JSON.stringify(ready)).not.toContain('"old"');
  expect(JSON.stringify(ready)).not.toContain(String(companyId));

  configure("next", { next });
  vi.stubEnv("CUSTOMER_CREDENTIAL_LEGACY_SECRET", "");
  vi.stubEnv("SESSION_SECRET", "");
  const missingKeys = await getCustomerCredentialReadiness({ environment: "development", companyId });
  expect(missingKeys).toMatchObject({
    status: "blocked",
    blockingCategories: ["historical_key_missing", "legacy_secret_missing"],
    counts: {
      total: 2,
      missingHistoricalKey: 1,
      legacyKeyUnavailable: 1,
    },
  });
  const alert = vi.spyOn(logger, "error");
  logCustomerCredentialReadiness(missingKeys);
  const serializedAlert = JSON.stringify(alert.mock.calls);
  expect(serializedAlert).toContain("historical_key_missing");
  expect(serializedAlert).not.toContain(historical.encryptedCredential);
  expect(serializedAlert).not.toContain('"old"');
  expect(serializedAlert).not.toContain(String(companyId));
  alert.mockRestore();

  vi.stubEnv("CUSTOMER_CREDENTIAL_KEYS", "");
  const invalidKeyring = await getCustomerCredentialReadiness({ environment: "development", companyId });
  expect(invalidKeyring).toMatchObject({
    status: "blocked",
    configurationCategory: "keyring_missing",
    counts: { version2: 1, unverifiableVersion2: 1 },
  });
});

describe("resumable credential re-encryption", () => {
  it("supports dry run, partial migration, interruption, mixed-version reads and safe key retirement", async () => {
    const first = await insert("v1"), second = await insert("v2"), production = await insert("v2", "production");
    const metadata = await db.select().from(integrationConnectionsTable).where(eq(integrationConnectionsTable.companyId, companyId));
    configure("next");
    const dry = await rotate();
    expect(dry).toMatchObject({ scanned: 2, pending: 2, migrated: 0, failed: 0, exhausted: true });
    expect((await rows()).find(r => r.connectionId === first.connectionId)?.encryptedCredential).toBe(first.encryptedCredential);
    const partial = await rotate({ apply: true, maxRows: 1 });
    expect(partial).toMatchObject({ scanned: 1, migrated: 1, failed: 0 });
    for (const row of await rows()) expect(openCredential(row.encryptedCredential,
      credentialContext(companyId, row.provider, row.environment, row.connectionId))).toEqual({ apiKey: "fake-test-only" });
    // Simulate restarting after a process exits: no in-memory cursor is needed.
    const resumed = await rotate({ apply: true });
    expect(resumed).toMatchObject({ current: 1, migrated: 1, failed: 0 });
    const beforeRepeat = await rows();
    expect(await rotate({ apply: true })).toMatchObject({ current: 2, migrated: 0 });
    expect(await rows()).toEqual(beforeRepeat);
    expect(await db.select().from(integrationConnectionsTable).where(eq(integrationConnectionsTable.companyId, companyId))).toEqual(metadata);
    expect(beforeRepeat.find(r => r.connectionId === production.connectionId)?.encryptedCredential).toBe(production.encryptedCredential);
    configure("next", { next });
    for (const row of (await rows()).filter(r => r.connectionId !== production.connectionId)) {
      expect(openCredential(row.encryptedCredential, credentialContext(companyId, row.provider, row.environment, row.connectionId))).toEqual({ apiKey: "fake-test-only" });
    }
    expect(second.connectionId).toBeGreaterThan(first.connectionId);
  });
  it("leaves failures intact, migrates other rows and resumes a saved cursor", async () => {
    const missing = await insert("v2");
    configure("next");
    const good = await insert("v1");
    const tampered = await insert("v2");
    await db.update(credentials).set({ encryptedCredential: tampered.encryptedCredential + ".invalid" }).where(eq(credentials.connectionId, tampered.connectionId));
    configure("next", { next });
    const partial = await rotate({ apply: true, maxRows: 1 });
    expect(partial).toMatchObject({ failed: 1, migrated: 0, lastConnectionId: missing.connectionId });
    expect(await rotate({ apply: true, afterConnectionId: partial.lastConnectionId })).toMatchObject({ failed: 1, migrated: 1 });
    const after = await rows();
    expect(after.find(r => r.connectionId === missing.connectionId)?.encryptedCredential).toBe(missing.encryptedCredential);
    expect(after.find(r => r.connectionId === good.connectionId)?.encryptedCredential).toMatch(/^v2.next\./);
    configure("next");
    expect(await rotate({ apply: true })).toMatchObject({ failed: 1, migrated: 1, current: 1 });
  });
  it("does not overwrite concurrent reconnection and can retry after a DB interruption", async () => {
    const row = await insert("v2");
    configure("next");
    const replacement = sealCredential({ apiKey: "replacement-test-only" }, credentialContext(companyId, row.provider, "development", row.connectionId));
    const update = db.update.bind(db);
    vi.spyOn(db, "update").mockImplementationOnce((table: Parameters<typeof db.update>[0]) => {
      const builder = update(table);
      const set = builder.set.bind(builder);
      builder.set = ((values: Parameters<typeof builder.set>[0]) => {
        const query = set(values);
        const where = query.where.bind(query);
        query.where = ((condition: Parameters<typeof query.where>[0]) => {
          const pending = where(condition);
          const returning = pending.returning.bind(pending);
          pending.returning = (async (...args: Parameters<typeof pending.returning>) => {
            await update(credentials).set({ encryptedCredential: replacement }).where(eq(credentials.connectionId, row.connectionId));
            return returning(...args);
          }) as typeof pending.returning;
          return pending;
        }) as typeof query.where;
        return query;
      }) as typeof builder.set;
      return builder;
    });
    expect(await rotate({ apply: true })).toMatchObject({ conflicts: 1, migrated: 0 });
    expect((await rows())[0].encryptedCredential).toBe(replacement);
    configure("old");
    await insert("v2");
    configure("next");
    vi.spyOn(db, "update").mockImplementationOnce(() => { throw new Error("Simulated database outage"); });
    expect(await rotate({ apply: true })).toMatchObject({ failed: 1, migrated: 0, current: 1 });
    expect(await rotate({ apply: true })).toMatchObject({ failed: 0, migrated: 1, current: 1 });
  });
});
