import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

/** Additive, idempotent migration for existing published databases. */
export async function ensureCustomerCredentialSchema(): Promise<void> {
  await db.transaction(async tx => {
    // Serialize concurrent replicas; IF NOT EXISTS alone can race on PG catalogs.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(92043112)`);
    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS "integration_credentials" (
        "connection_id" integer PRIMARY KEY REFERENCES "integration_connections"("id") ON DELETE CASCADE,
        "company_id" integer NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
        "provider" text NOT NULL,
        "environment" text NOT NULL,
        "encrypted_credential" text NOT NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  });
  logger.info("Customer integration credential schema ensured");
}
