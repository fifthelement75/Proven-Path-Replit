import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("peer_review_completed"),
  relatedEmployeeId: integer("related_employee_id"),
  relatedRequestId: integer("related_request_id"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
