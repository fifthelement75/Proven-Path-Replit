import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";
import { candidateProfilesTable } from "./candidateProfiles";

export const interviewAssessmentsTable = pgTable("interview_assessments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  candidateId: integer("candidate_id").notNull().references(() => candidateProfilesTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  level: text("level").notNull(),
  interviewerId: integer("interviewer_id"),
  panelInviteId: integer("panel_invite_id"),
  panelistEmail: text("panelist_email"),
  interviewDate: text("interview_date").notNull(),
  scores: text("scores"),
  feedback: text("feedback"),
  overallRecommendation: text("overall_recommendation"),
  notes: text("notes"),
  overallScore: text("overall_score"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type InterviewAssessment = typeof interviewAssessmentsTable.$inferSelect;
