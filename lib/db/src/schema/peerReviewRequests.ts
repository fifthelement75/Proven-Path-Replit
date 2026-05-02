import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { employeesTable } from "./employees";
import { companiesTable } from "./companies";

export const peerReviewRequestsTable = pgTable("peer_review_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  requestedByUserId: integer("requested_by_user_id").notNull(),
  peerEmail: text("peer_email").notNull(),
  peerName: text("peer_name"),
  token: text("token").notNull().unique(),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PeerReviewRequest = typeof peerReviewRequestsTable.$inferSelect;
