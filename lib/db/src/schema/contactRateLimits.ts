import { check, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const contactRateLimitBucketsTable = pgTable(
  "contact_rate_limit_buckets",
  {
    bucketHash: text("bucket_hash").primaryKey(),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
    requestCount: integer("request_count").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  table => [
    check(
      "contact_rate_limit_buckets_request_count_check",
      sql`${table.requestCount} > 0`,
    ),
    index("contact_rate_limit_buckets_expires_at_idx").on(table.expiresAt),
  ],
);
