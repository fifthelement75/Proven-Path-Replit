import { db, integrationCredentialsTable as credentials } from "@workspace/db";
import { and, asc, eq, gt, sql } from "drizzle-orm";
import {
  credentialContext,
  credentialKeyring,
  inspectCustomerCredentialKeyring,
  openCredential,
  sealCredential,
  type CredentialKeyringIssue,
} from "./customerCredentialCrypto";
import { logger } from "./logger";

export type CredentialReadinessBlocker =
  | CredentialKeyringIssue
  | "historical_key_missing"
  | "legacy_secret_missing"
  | "unrecognized_envelope";

export type CustomerCredentialReadinessReport = {
  status: "ready" | "blocked";
  environment: "development" | "production";
  configurationCategory: CredentialKeyringIssue | null;
  configuredKeyCount: number;
  legacyDecryptionConfigured: boolean;
  blockingCategories: CredentialReadinessBlocker[];
  counts: {
    total: number;
    legacyV1: number;
    version2: number;
    missingHistoricalKey: number;
    unverifiableVersion2: number;
    legacyKeyUnavailable: number;
    unrecognizedEnvelope: number;
  };
};

export type RotationOptions = {
  environment: "development" | "production";
  apply?: boolean;
  batchSize?: number;
  maxRows?: number;
  afterConnectionId?: number;
  companyId?: number;
};

/**
 * Read-only header inventory for the active deployment environment.
 * The query returns only grouped envelope versions/key IDs and counts; it
 * never returns encrypted envelopes, provider data, or company identifiers.
 */
export async function getCustomerCredentialReadiness(options: {
  environment: "development" | "production";
  companyId?: number;
}): Promise<CustomerCredentialReadinessReport> {
  const { environment, companyId } = options;
  const keyring = inspectCustomerCredentialKeyring();
  const companyFilter = companyId === undefined
    ? sql``
    : sql`AND "company_id" = ${companyId}`;
  const groups = await db.execute(sql`
    SELECT
      CASE
        WHEN "encrypted_credential" ~ '^v1\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$' THEN 'legacy_v1'
        WHEN "encrypted_credential" ~ '^v2\\.[A-Za-z0-9_-]{1,64}\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$' THEN 'v2'
        ELSE 'unknown'
      END AS "version",
      CASE
        WHEN "encrypted_credential" ~ '^v2\\.[A-Za-z0-9_-]{1,64}\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$'
          THEN substring("encrypted_credential" from '^v2\\.([A-Za-z0-9_-]{1,64})\\.')
        ELSE NULL
      END AS "keyId",
      count(*)::int AS "count"
    FROM "integration_credentials"
    WHERE "environment" = ${environment}
    ${companyFilter}
    GROUP BY 1, 2
  `);

  const counts = {
    total: 0,
    legacyV1: 0,
    version2: 0,
    missingHistoricalKey: 0,
    unverifiableVersion2: 0,
    legacyKeyUnavailable: 0,
    unrecognizedEnvelope: 0,
  };
  for (const group of groups.rows as Array<{ version: string; keyId: string | null; count: number | string }>) {
    const count = Number(group.count);
    counts.total += count;
    if (group.version === "legacy_v1") {
      counts.legacyV1 += count;
    } else if (group.version === "v2") {
      counts.version2 += count;
      if (!keyring.ready) counts.unverifiableVersion2 += count;
      else if (!group.keyId || !keyring.hasKeyId(group.keyId)) counts.missingHistoricalKey += count;
    } else {
      counts.unrecognizedEnvelope += count;
    }
  }
  if (!keyring.legacyDecryptionConfigured) {
    counts.legacyKeyUnavailable = counts.legacyV1;
  }

  const blockingCategories: CredentialReadinessBlocker[] = [];
  if (keyring.configurationCategory) blockingCategories.push(keyring.configurationCategory);
  if (counts.missingHistoricalKey) blockingCategories.push("historical_key_missing");
  if (counts.legacyKeyUnavailable) blockingCategories.push("legacy_secret_missing");
  if (counts.unrecognizedEnvelope) blockingCategories.push("unrecognized_envelope");

  return {
    status: blockingCategories.length ? "blocked" : "ready",
    environment,
    configurationCategory: keyring.configurationCategory,
    configuredKeyCount: keyring.configuredKeyCount,
    legacyDecryptionConfigured: keyring.legacyDecryptionConfigured,
    blockingCategories,
    counts,
  };
}

/** Log only operational categories and aggregate counts; never key IDs or row data. */
export function logCustomerCredentialReadiness(report: CustomerCredentialReadinessReport): void {
  const safeReport = {
    status: report.status,
    environment: report.environment,
    configurationCategory: report.configurationCategory,
    configuredKeyCount: report.configuredKeyCount,
    legacyDecryptionConfigured: report.legacyDecryptionConfigured,
    blockingCategories: report.blockingCategories,
    counts: report.counts,
  };
  if (report.status === "blocked") {
    logger.error({ customerCredentialReadiness: safeReport }, "Customer credential encryption readiness is blocked");
  } else {
    logger.info({ customerCredentialReadiness: safeReport }, "Customer credential encryption readiness is ready");
  }
}

// Keyset pagination + per-row compare-and-swap make retries safe after interruption.
// No plaintext, ciphertext, provider responses or raw exception objects leave this function.
export async function rotateCustomerCredentials(options: RotationOptions) {
  const { environment, apply = false, batchSize = 100, maxRows = 1000, afterConnectionId = 0, companyId } = options;
  if (!["development", "production"].includes(environment) ||
      !Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 1000 ||
      !Number.isSafeInteger(maxRows) || maxRows < 1 ||
      !Number.isSafeInteger(afterConnectionId) || afterConnectionId < 0 ||
      (companyId !== undefined && (!Number.isSafeInteger(companyId) || companyId < 1))) {
    throw new Error("Invalid credential rotation options.");
  }
  const ring = credentialKeyring(); // Freeze the target for the whole batch.
  const result = { scanned: 0, current: 0, pending: 0, migrated: 0, conflicts: 0, failed: 0,
    lastConnectionId: afterConnectionId, exhausted: false };
  while (result.scanned < maxRows) {
    const rows = await db.select().from(credentials).where(and(
      eq(credentials.environment, environment), gt(credentials.connectionId, result.lastConnectionId),
      companyId === undefined ? undefined : eq(credentials.companyId, companyId),
    )).orderBy(asc(credentials.connectionId)).limit(Math.min(batchSize, maxRows - result.scanned));
    if (!rows.length) { result.exhausted = true; break; }
    for (const row of rows) {
      result.scanned++;
      result.lastConnectionId = row.connectionId;
      try {
        const aad = credentialContext(row.companyId, row.provider, row.environment, row.connectionId);
        const value = openCredential(row.encryptedCredential, aad, ring);
        if (row.encryptedCredential.startsWith(`v2.${ring.activeId}.`)) { result.current++; continue; }
        result.pending++;
        if (!apply) continue;
        const encryptedCredential = sealCredential(value, aad, ring);
        const changed = await db.update(credentials).set({ encryptedCredential, updatedAt: new Date() }).where(and(
          eq(credentials.connectionId, row.connectionId), eq(credentials.companyId, row.companyId),
          eq(credentials.provider, row.provider), eq(credentials.environment, row.environment),
          eq(credentials.encryptedCredential, row.encryptedCredential),
        )).returning({ connectionId: credentials.connectionId });
        if (changed.length) result.migrated++; else result.conflicts++;
      } catch { result.failed++; }
    }
  }
  return result;
}
