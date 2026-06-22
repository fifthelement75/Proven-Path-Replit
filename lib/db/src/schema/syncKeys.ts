import { pgTable, text, serial, integer, timestamp, unique, index } from "drizzle-orm/pg-core";

export const syncKeysTable = pgTable(
  "sync_keys",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id").notNull(),
    keyHash: text("key_hash").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyUnique: unique("sync_keys_company_unique").on(table.companyId),
    keyHashIdx: index("sync_keys_key_hash_idx").on(table.keyHash),
  }),
);

export type SyncKey = typeof syncKeysTable.$inferSelect;
