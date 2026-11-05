import { db, integrationCredentialsTable as credentials } from "@workspace/db";
import { and, asc, eq, gt } from "drizzle-orm";
import { credentialContext, credentialKeyring, openCredential, sealCredential } from "./customerCredentialCrypto";

export type RotationOptions = {
  environment: "development" | "production";
  apply?: boolean;
  batchSize?: number;
  maxRows?: number;
  afterConnectionId?: number;
  companyId?: number;
};

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
