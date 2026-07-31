import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";
import { candidateProfilesTable } from "./candidateProfiles";

export const panelInvitesTable = pgTable("panel_invites", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  candidateId: integer("candidate_id").notNull().references(() => candidateProfilesTable.id, { onDelete: "cascade" }),
  invitedByUserId: integer("invited_by_user_id").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  level: text("level").notNull(),
  interviewDate: text("interview_date").notNull(),
  token: text("token").notNull().unique(),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PanelInvite = typeof panelInvitesTable.$inferSelect;
