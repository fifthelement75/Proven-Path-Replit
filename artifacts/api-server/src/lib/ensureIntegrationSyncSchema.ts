import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function ensureIntegrationSyncSchema() {
  await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(92043113)`);
    await tx.execute(sql`
    ALTER TABLE integration_imports ADD COLUMN IF NOT EXISTS sync_baseline jsonb;
    CREATE TABLE IF NOT EXISTS integration_sync (
      id serial PRIMARY KEY, company_id integer NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      connection_id integer NOT NULL UNIQUE REFERENCES integration_connections(id) ON DELETE CASCADE,
      enabled boolean NOT NULL DEFAULT false, config jsonb NOT NULL, draft jsonb, preview_id text,
      approved_account text, approved_at timestamptz, last_sync_at timestamptz, next_sync_at timestamptz,
      cursor jsonb NOT NULL DEFAULT '{}', message text
    );
    CREATE TABLE IF NOT EXISTS integration_sync_writes (
      id serial PRIMARY KEY, company_id integer NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      provider text NOT NULL, remote_id text NOT NULL, payload_hash text NOT NULL,
      status text NOT NULL, message text, created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT integration_sync_write_identity UNIQUE(company_id, provider, remote_id, payload_hash)
    );
    `);
  });
}
