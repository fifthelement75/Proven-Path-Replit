import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const candidateProfilesTable = pgTable("candidate_profiles", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  roleApplyingFor: text("role_applying_for").notNull(),
  levelApplyingFor: text("level_applying_for"),
  resumeUrl: text("resume_url"),
  source: text("source"),
  status: text("status").notNull().default("interviewing"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type CandidateProfile = typeof candidateProfilesTable.$inferSelect;
