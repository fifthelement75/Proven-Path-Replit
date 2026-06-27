import { pgTable, text, serial, timestamp, integer, type AnyPgColumn } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  department: text("department").notNull(),
  level: text("level").notNull(),
  startDate: text("start_date").notNull(),
  managerId: integer("manager_id").references((): AnyPgColumn => employeesTable.id, { onDelete: "set null" }),
  passwordHash: text("password_hash"),
  userRole: text("user_role").notNull().default("employee"),
  profilePhotoUrl: text("profile_photo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// NOTE: Case-insensitive uniqueness of email per company is enforced by the
// `employees_company_email_lower_unique` unique index on (company_id, lower(email)).
// This index is created manually via raw SQL and intentionally kept OUT of the
// Drizzle schema: `drizzle-kit push` mis-generates the operator class for the
// lower(email) text expression (applies int4_ops instead of text_ops), which
// breaks the deploy-time migration. Do not add this index to the Drizzle schema.

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeesTable.$inferSelect;
