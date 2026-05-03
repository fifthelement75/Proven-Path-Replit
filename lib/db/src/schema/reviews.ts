import { pgTable, text, serial, timestamp, integer, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { employeesTable } from "./employees";

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  reviewType: text("review_type").notNull(), // self, peer, manager
  reviewerId: integer("reviewer_id").references(() => employeesTable.id, { onDelete: "set null" }),
  period: text("period").notNull(),
  status: text("status").notNull().default("draft"), // draft, submitted
  technicalScore: integer("technical_score"),
  communicationScore: integer("communication_score"),
  problemSolvingScore: integer("problem_solving_score"),
  teamworkScore: integer("teamwork_score"),
  leadershipScore: integer("leadership_score"),
  overallScore: real("overall_score"),
  strengths: text("strengths"),
  areasToImprove: text("areas_to_improve"),
  goals: text("goals"),
  recommendation: text("recommendation"),
  behavioralScores: jsonb("behavioral_scores").$type<Record<string, number>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
