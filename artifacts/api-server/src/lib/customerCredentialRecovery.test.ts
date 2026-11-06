import { afterEach, expect, it, vi } from "vitest";
import { createCipheriv, hkdfSync, randomBytes } from "node:crypto";
import { db, integrationCredentialsTable as credentials } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  credentialContext,
  openCredential,
  sealCredential,
  type Credential,
} from "./customerCredentialCrypto";

// Ephemeral, synthetic fixtures only. No deployment or customer secrets are read.
const legacySecret = "recovery-rehearsal-only-legacy-secret-not-for-deployment";
const legacySessionSecret = "recovery-rehearsal-only-rotated-session-secret";
const oldKey = randomBytes(32).toString("base64");
const newKey = randomBytes(32).toString("base64");
const fixtureCredential: Credential = { apiKey: "recovery-rehearsal-fake-api-key" };
const genericMissingKeyMessage =
  "Customer credential encryption keys are unavailable. Contact the platform administrator.";

function configureKeyring(keys: Record<string, string>, activeId: string) {
  vi.stubEnv("CUSTOMER_CREDENTIAL_KEYS", JSON.stringify(keys));
  vi.stubEnv("CUSTOMER_CREDENTIAL_ACTIVE_KEY_ID", activeId);
  vi.stubEnv("CUSTOMER_CREDENTIAL_LEGACY_SECRET", legacySecret);
  // Deliberately differ from the captured legacy secret, as after session rotation.
  vi.stubEnv("SESSION_SECRET", legacySessionSecret);
}

function makeLegacyEnvelope(aad: string): string {
  const key = Buffer.from(
    hkdfSync("sha256", legacySecret, "provenpath.customer-credentials.v1", aad, 32),
  );
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(aad));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(fixtureCredential)),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it("restores mixed-version snapshots with escrowed keys and fails closed when a historical key is missing", async () => {
  const oldKeys = { old: oldKey };
  configureKeyring(oldKeys, "old");

  const fixtures = [
    {
      connectionId: 910001,
      companyId: 810001,
      provider: "otter",
      environment: "development",
      version: "legacy-v1",
    },
    {
      connectionId: 910002,
      companyId: 810001,
      provider: "icims",
      environment: "production",
      version: "old-key-v2",
    },
    {
      connectionId: 910003,
      companyId: 810002,
      provider: "otter",
      environment: "development",
      version: "new-key-v2",
    },
  ] as const;

  const oldKeyEnvelope = sealCredential(
    fixtureCredential,
    credentialContext(810001, "icims", "production", 910002),
  );
  configureKeyring({ old: oldKey, new: newKey }, "new");
  const newKeyEnvelope = sealCredential(
    fixtureCredential,
    credentialContext(810002, "otter", "development", 910003),
  );
  const envelopes = [
    makeLegacyEnvelope(credentialContext(810001, "otter", "development", 910001)),
    oldKeyEnvelope,
    newKeyEnvelope,
  ];

  // Capture console output so the rehearsal can assert it never logs credentials,
  // key material, envelopes, or low-level crypto errors.
  const logSpies = [
    vi.spyOn(console, "log").mockImplementation(() => {}),
    vi.spyOn(console, "info").mockImplementation(() => {}),
    vi.spyOn(console, "warn").mockImplementation(() => {}),
    vi.spyOn(console, "error").mockImplementation(() => {}),
  ];

  const schema = `credential_recovery_${randomBytes(8).toString("hex")}`;
  await db.transaction(async tx => {
    await tx.execute(sql.raw(`CREATE SCHEMA "${schema}"`));
    await tx.execute(sql.raw(`SET LOCAL search_path TO "${schema}", public`));
    await tx.execute(sql`
      CREATE TABLE "integration_credentials"
      (LIKE public.integration_credentials INCLUDING ALL)
    `);

    try {
      const snapshotRows = fixtures.map((fixture, index) => ({
        connectionId: fixture.connectionId,
        companyId: fixture.companyId,
        provider: fixture.provider,
        environment: fixture.environment,
        encryptedCredential: envelopes[index],
      }));

      // This array is the backup artifact. All row data is synthetic and kept in
      // memory; the actual table lives only in the transaction's disposable schema.
      await tx.insert(credentials).values(snapshotRows);
      const snapshot = await tx.select().from(credentials);
      expect(snapshot).toHaveLength(3);
      expect(snapshot.map(row => row.encryptedCredential.split(".")[0])).toEqual([
        "v1",
        "v2",
        "v2",
      ]);
      expect(snapshot[1].encryptedCredential).toMatch(/^v2\.old\./);
      expect(snapshot[2].encryptedCredential).toMatch(/^v2\.new\./);
      expect(snapshot.every(row =>
        !row.encryptedCredential.includes(fixtureCredential.apiKey)
      )).toBe(true);

      // Simulate loss of the restored table contents followed by a backup restore.
      await tx.delete(credentials);
      expect(await tx.select().from(credentials)).toHaveLength(0);
      await tx.insert(credentials).values(snapshot);
      const restored = await tx.select().from(credentials);
      expect(restored).toHaveLength(3);

      // Secure escrow for this rehearsal is represented by the retained synthetic
      // legacy secret and both historical v2 keys, with the new key still active.
      configureKeyring({ old: oldKey, new: newKey }, "new");
      for (const row of restored) {
        const aad = credentialContext(
          row.companyId,
          row.provider,
          row.environment,
          row.connectionId,
        );
        expect(openCredential(row.encryptedCredential, aad)).toEqual(fixtureCredential);

        const wrongTenant = credentialContext(
          row.companyId + 1,
          row.provider,
          row.environment,
          row.connectionId,
        );
        const wrongEnvironment = credentialContext(
          row.companyId,
          row.provider,
          row.environment === "development" ? "production" : "development",
          row.connectionId,
        );
        expect(() => openCredential(row.encryptedCredential, wrongTenant))
          .toThrow(expect.objectContaining({ status: 409 }));
        expect(() => openCredential(row.encryptedCredential, wrongEnvironment))
          .toThrow(expect.objectContaining({ status: 409 }));
      }

      // A restored old-key envelope cannot be opened if its escrowed key is absent.
      // The error stays generic and does not identify a key ID or reveal its payload.
      configureKeyring({ new: newKey }, "new");
      let missingKeyError: unknown;
      try {
        const row = restored.find(item => item.encryptedCredential.startsWith("v2.old."));
        if (!row) throw new Error("Missing old-key fixture row");
        openCredential(
          row.encryptedCredential,
          credentialContext(row.companyId, row.provider, row.environment, row.connectionId),
        );
      } catch (error) {
        missingKeyError = error;
      }
      expect(missingKeyError).toMatchObject({
        status: 503,
        message: genericMissingKeyMessage,
      });
      expect((missingKeyError as Error).message).not.toContain("recovery-rehearsal-fake-api-key");
      expect(logSpies.every(spy => spy.mock.calls.length === 0)).toBe(true);
    } finally {
      await tx.execute(sql.raw(`DROP SCHEMA "${schema}" CASCADE`));
    }
  });
});
