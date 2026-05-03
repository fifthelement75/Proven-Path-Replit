import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { employeesTable } from "./employees";
import { companiesTable } from "./companies";

export const selfReflectionRequestsTable = pgTable("self_reflection_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  requestedByUserId: integer("requested_by_user_id").notNull(),
  employeeEmail: text("employee_email").notNull(),
  period: text("period").notNull(),
  message: text("message"),
  token: text("token").notNull().unique(),
  status: text("status").notNull().default("pending"),
  reviewId: integer("review_id"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SelfReflectionRequest = typeof selfReflectionRequestsTable.$inferSelect;
