import { pool } from "@workspace/db";
import { rotateCustomerCredentials, type RotationOptions } from "./lib/customerCredentialRotation";
import { logger } from "./lib/logger";

try {
  const args = process.argv.slice(2);
  const allowed = new Set(["--environment", "--batch-size", "--max-rows", "--after-connection-id", "--company-id"]);
  const values = new Map<string, string>();
  let apply = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--apply" && !apply) { apply = true; continue; }
    if (!allowed.has(args[i]) || values.has(args[i]) || !args[i + 1] || args[i + 1].startsWith("--")) throw new Error();
    values.set(args[i], args[++i]);
  }
  const result = await rotateCustomerCredentials({
    environment: values.get("--environment") as RotationOptions["environment"],
    apply,
    batchSize: Number(values.get("--batch-size") ?? 100),
    maxRows: Number(values.get("--max-rows") ?? 1000),
    afterConnectionId: Number(values.get("--after-connection-id") ?? 0),
    companyId: values.has("--company-id") ? Number(values.get("--company-id")) : undefined,
  });
  logger.info({ rotation: result, apply }, "Customer credential rotation batch finished");
  if (result.failed || result.conflicts) process.exitCode = 1;
} catch {
  logger.error("Customer credential rotation failed. Check options, database access and encryption key configuration.");
  process.exitCode = 1;
} finally { await pool.end(); }
