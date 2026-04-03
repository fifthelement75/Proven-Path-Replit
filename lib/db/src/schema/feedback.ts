import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { employeesTable } from "./employees";

export const feedbackTable = pgTable("feedback", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  managerId: integer("manager_id").references(() => employeesTable.id, { onDelete: "set null" }),
  meetingType: text("meeting_type").notNull(),
  meetingDate: text("meeting_date").notNull(),
  whatWentWell: text("what_went_well"),
  areasToImprove: text("areas_to_improve"),
  actionItems: text("action_items"),
  nextSteps: text("next_steps"),
  employeeResponse: text("employee_response"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFeedbackSchema = createInsertSchema(feedbackTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedbackTable.$inferSelect;
