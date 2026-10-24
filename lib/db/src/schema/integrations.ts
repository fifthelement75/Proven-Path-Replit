import { sql } from "drizzle-orm";
import { pgTable, text, serial, integer, timestamp, unique, uniqueIndex } from "drizzle-orm/pg-core";

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
    companyCategoryProviderUnique: unique("integration_connections_company_category_provider_unique").on(
      table.companyId,
      table.category,
      table.provider,
    ),
    singleProviderCategoryUnique: uniqueIndex("integration_connections_single_provider_category_unique")
      .on(table.companyId, table.category)
      .where(sql`${table.category} <> 'meeting'`),
  }),
);

export type IntegrationConnection = typeof integrationConnectionsTable.$inferSelect;
