import { createHmac } from "node:crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const WINDOW_SECONDS = 60 * 60;
const WINDOW_LIMIT = 5;
const CLEANUP_EVERY = 128;
const CLEANUP_BATCH_SIZE = 500;
let requestsSinceCleanup = 0;

export function hashContactClientIp(ip: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Rate-limit key unavailable.");
  return createHmac("sha256", secret)
    .update("provenpath.contact-rate-limit.ip.v1\0")
    .update(ip)
    .digest("hex");
}

async function cleanupExpiredBuckets(): Promise<void> {
  requestsSinceCleanup++;
  if (requestsSinceCleanup < CLEANUP_EVERY) return;
  requestsSinceCleanup = 0;
  await db.execute(sql`
    DELETE FROM "contact_rate_limit_buckets"
    WHERE "bucket_hash" IN (
      SELECT "bucket_hash" FROM "contact_rate_limit_buckets"
      WHERE "expires_at" <= now()
      ORDER BY "expires_at"
      LIMIT ${CLEANUP_BATCH_SIZE}
    )
  `);
}

async function reserveContactRequest(ipHash: string): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const inserted = await db.execute(sql`
    INSERT INTO "contact_rate_limit_buckets"
      ("bucket_hash", "window_started_at", "request_count", "expires_at")
    VALUES (${ipHash}, now(), 1, now() + make_interval(secs => ${WINDOW_SECONDS}))
    ON CONFLICT ("bucket_hash") DO UPDATE SET
      "window_started_at" = CASE
        WHEN "contact_rate_limit_buckets"."window_started_at" + make_interval(secs => ${WINDOW_SECONDS}) <= now() THEN now()
        ELSE "contact_rate_limit_buckets"."window_started_at"
      END,
      "request_count" = CASE
        WHEN "contact_rate_limit_buckets"."window_started_at" + make_interval(secs => ${WINDOW_SECONDS}) <= now() THEN 1
        ELSE "contact_rate_limit_buckets"."request_count" + 1
      END,
      "expires_at" = now() + make_interval(secs => ${WINDOW_SECONDS})
    WHERE "contact_rate_limit_buckets"."window_started_at" + make_interval(secs => ${WINDOW_SECONDS}) <= now()
       OR "contact_rate_limit_buckets"."request_count" < ${WINDOW_LIMIT}
    RETURNING GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM ("window_started_at" + make_interval(secs => ${WINDOW_SECONDS}) - now())))::integer
    ) AS "retry_after_seconds"
  `);

  if (inserted.rows.length) {
    return {
      allowed: true,
      retryAfterSeconds: Number(inserted.rows[0].retry_after_seconds),
    };
  }

  const blocked = await db.execute(sql`
    SELECT GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM ("window_started_at" + make_interval(secs => ${WINDOW_SECONDS}) - now())))::integer
    ) AS "retry_after_seconds"
    FROM "contact_rate_limit_buckets"
    WHERE "bucket_hash" = ${ipHash}
  `);
  if (!blocked.rows.length) throw new Error("Rate-limit bucket was unavailable.");
  return {
    allowed: false,
    retryAfterSeconds: Number(blocked.rows[0].retry_after_seconds),
  };
}

export async function checkContactRequestQuota(ip: string) {
  await cleanupExpiredBuckets();
  return reserveContactRequest(hashContactClientIp(ip || "unknown"));
}
