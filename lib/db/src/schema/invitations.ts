import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const invitationsTable = pgTable("invitations", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  userRole: text("user_role").notNull().default("employee"),
  token: text("token").notNull().unique(),
  status: text("status").notNull().default("pending"),
  invitedByUserId: integer("invited_by_user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertInvitationSchema = createInsertSchema(invitationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitationsTable.$inferSelect;
