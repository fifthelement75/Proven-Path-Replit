import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";
import { integrationConnectionsTable } from "./integrations";
import { companiesTable } from "./companies";

// Deliberately separate from connection metadata so list endpoints cannot expose envelopes.
export const integrationCredentialsTable = pgTable("integration_credentials", {
  connectionId: integer("connection_id").primaryKey().references(() => integrationConnectionsTable.id, { onDelete: "cascade" }),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  environment: text("environment").notNull(),
  encryptedCredential: text("encrypted_credential").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
