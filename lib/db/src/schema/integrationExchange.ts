import { pgTable, serial, integer, text, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
import { integrationConnectionsTable } from "./integrations";
import { companiesTable } from "./companies";

export const integrationRunsTable = pgTable("integration_runs", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id").notNull().references(() => integrationConnectionsTable.id, { onDelete: "cascade" }),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  requestId: text("request_id").notNull(),
  actionKey: text("action_key").notNull(),
  direction: text("direction").notNull(),
  status: text("status").notNull(),
  result: jsonb("result").$type<unknown>(),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => ({
  requestUnique: unique("integration_runs_request_unique").on(table.companyId, table.requestId),
}));

export const integrationImportsTable = pgTable("integration_imports", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id").references(() => integrationConnectionsTable.id, { onDelete: "set null" }),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  remoteId: text("remote_id").notNull(),
  kind: text("kind").notNull(),
  localId: integer("local_id").notNull(),
  payloadHash: text("payload_hash").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => ({
  remoteUnique: unique("integration_imports_remote_unique").on(table.companyId, table.provider, table.remoteId, table.kind),
}));
