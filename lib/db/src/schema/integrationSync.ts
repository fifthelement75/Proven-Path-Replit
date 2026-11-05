import { pgTable, serial, integer, text, timestamp, jsonb, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { integrationConnectionsTable } from "./integrations";
import { companiesTable } from "./companies";

export const integrationSyncTable = pgTable("integration_sync", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  connectionId: integer("connection_id").notNull().references(() => integrationConnectionsTable.id, { onDelete: "cascade" }).unique(),
  enabled: boolean("enabled").notNull().default(false),
  config: jsonb("config").notNull().$type<Record<string, any>>(),
  draft: jsonb("draft").$type<Record<string, any>>(),
  previewId: text("preview_id"),
  approvedAccount: text("approved_account"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  nextSyncAt: timestamp("next_sync_at", { withTimezone: true }),
  cursor: jsonb("cursor").notNull().default({}).$type<Record<string, any>>(),
  message: text("message"),
});

// This ledger intentionally survives connection deletion. A crash after dispatch
// must never turn an uncertain write into a new automatic write on reconnect.
export const integrationSyncWritesTable = pgTable("integration_sync_writes", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  remoteId: text("remote_id").notNull(),
  payloadHash: text("payload_hash").notNull(),
  status: text("status").notNull(),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({ identity: unique("integration_sync_write_identity").on(t.companyId, t.provider, t.remoteId, t.payloadHash) }));

export const insertIntegrationSyncSchema = createInsertSchema(integrationSyncTable).omit({ id: true });
export type IntegrationSync = typeof integrationSyncTable.$inferSelect;
export type InsertIntegrationSync = typeof integrationSyncTable.$inferInsert;
