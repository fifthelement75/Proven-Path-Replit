import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Idempotent billing DDL for environments where the project migration runner
 * cannot safely apply schema changes automatically.
 */
export async function ensureBillingSchema(): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "companies"
    ADD COLUMN IF NOT EXISTS "stripe_seat_quantity" integer
  `);
  logger.info("Billing schema ensured");
}