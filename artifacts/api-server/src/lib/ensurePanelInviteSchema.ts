import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Idempotent DDL for the panel invite feature. The project has no automated
 * migration pipeline (drizzle-kit push hangs on unrelated drift), so this
 * guarantees the schema exists in any environment (dev and published/production)
 * before the routes and the reminder scheduler use it.
 *
 * Mirrors lib/db/drizzle/0001_panel_invites_and_reminders.sql (panel feature parts).
 */
export async function ensurePanelInviteSchema(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "panel_invites" (
      "id" serial PRIMARY KEY NOT NULL,
      "company_id" integer NOT NULL,
      "candidate_id" integer NOT NULL,
      "invited_by_user_id" integer NOT NULL,
      "email" text NOT NULL,
      "role" text NOT NULL,
      "level" text NOT NULL,
      "interview_date" text NOT NULL,
      "token" text NOT NULL,
      "status" text DEFAULT 'pending' NOT NULL,
      "expires_at" timestamp with time zone,
      "reminder_sent_at" timestamp with time zone,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "panel_invites_token_unique" UNIQUE("token")
    )
  `);
  await db.execute(sql`ALTER TABLE "panel_invites" ADD COLUMN IF NOT EXISTS "reminder_sent_at" timestamp with time zone`);
  await db.execute(sql`ALTER TABLE "interview_assessments" ADD COLUMN IF NOT EXISTS "panel_invite_id" integer`);
  await db.execute(sql`ALTER TABLE "interview_assessments" ADD COLUMN IF NOT EXISTS "panelist_email" text`);
  await db.execute(sql`ALTER TABLE "candidate_profiles" ADD COLUMN IF NOT EXISTS "panel_ai_summary" text`);
  await db.execute(sql`ALTER TABLE "candidate_profiles" ADD COLUMN IF NOT EXISTS "panel_ai_summary_at" timestamp with time zone`);
  await db.execute(sql`DO $$ BEGIN
    ALTER TABLE "panel_invites" ADD CONSTRAINT "panel_invites_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  await db.execute(sql`DO $$ BEGIN
    ALTER TABLE "panel_invites" ADD CONSTRAINT "panel_invites_candidate_id_candidate_profiles_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidate_profiles"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  // One review per peer-review request (backs the atomic submit claim).
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "peer_reviews_request_id_unique" ON "peer_reviews" ("request_id")`);
  logger.info("Panel invite schema ensured");
}
