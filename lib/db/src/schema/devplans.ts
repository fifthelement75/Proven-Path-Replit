import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { employeesTable } from "./employees";

export const devPlansTable = pgTable("dev_plans", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }).unique(),
  summary: text("summary").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const devPlanSkillsTable = pgTable("dev_plan_skills", {
  id: serial("id").primaryKey(),
  devPlanId: integer("dev_plan_id").notNull().references(() => devPlansTable.id, { onDelete: "cascade" }),
  skillName: text("skill_name").notNull(),
  priority: integer("priority").notNull().default(1),
  description: text("description").notNull(),
  resources: text("resources"),
  timeline: text("timeline"),
  nextSteps: text("next_steps"),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDevPlanSchema = createInsertSchema(devPlansTable).omit({ id: true, createdAt: true, updatedAt: true, generatedAt: true });
export type InsertDevPlan = z.infer<typeof insertDevPlanSchema>;
export type DevPlan = typeof devPlansTable.$inferSelect;

export const insertDevPlanSkillSchema = createInsertSchema(devPlanSkillsTable).omit({ id: true, createdAt: true });
export type InsertDevPlanSkill = z.infer<typeof insertDevPlanSkillSchema>;
export type DevPlanSkill = typeof devPlanSkillsTable.$inferSelect;
