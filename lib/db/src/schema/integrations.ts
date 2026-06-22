import { pgTable, text, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";

export const integrationConnectionsTable = pgTable(
  "integration_connections",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id").notNull(),
    category: text("category").notNull(),
    provider: text("provider").notNull(),
    status: text("status").notNull().default("connected"),
    accountLabel: text("account_label"),
    connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyCategoryUnique: unique("integration_connections_company_category_unique").on(
      table.companyId,
      table.category,
    ),
  }),
);

export type IntegrationConnection = typeof integrationConnectionsTable.$inferSelect;
