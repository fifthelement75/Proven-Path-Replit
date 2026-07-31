-- Panel interview invitations + expiry reminders.
-- Forward-only and idempotent: safe against a fresh 0000 baseline and against
-- environments where parts of this schema were already applied manually.
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
);
--> statement-breakpoint
ALTER TABLE "panel_invites" ADD COLUMN IF NOT EXISTS "reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD COLUMN IF NOT EXISTS "panel_ai_summary" text;--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD COLUMN IF NOT EXISTS "panel_ai_summary_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "interview_assessments" ADD COLUMN IF NOT EXISTS "panel_invite_id" integer;--> statement-breakpoint
ALTER TABLE "interview_assessments" ADD COLUMN IF NOT EXISTS "panelist_email" text;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "panel_invites" ADD CONSTRAINT "panel_invites_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "panel_invites" ADD CONSTRAINT "panel_invites_candidate_id_candidate_profiles_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidate_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
