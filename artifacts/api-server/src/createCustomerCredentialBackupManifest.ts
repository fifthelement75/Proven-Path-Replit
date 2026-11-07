import { db, integrationCredentialsTable as credentials, pool } from "@workspace/db";
import { createCredentialBackupManifest } from "./lib/customerCredentialBackupManifest";

function option(args: string[], name: string): string {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1] || args[index + 1].startsWith("--") ||
      args.indexOf(name, index + 1) >= 0) {
    throw new Error();
  }
  return args[index + 1];
}

try {
  const args = process.argv.slice(2);
  if (![4, 6].includes(args.length) || args.some((arg, index) =>
    index % 2 === 0 && !["--snapshot-id", "--retention-expires-at", "--generated-at"].includes(arg)
  )) throw new Error();

  const encryptedRows = await db.select({
    encryptedCredential: credentials.encryptedCredential,
  }).from(credentials);
  const manifest = createCredentialBackupManifest({
    snapshotId: option(args, "--snapshot-id"),
    retentionExpiresAt: option(args, "--retention-expires-at"),
    generatedAt: args.includes("--generated-at")
      ? option(args, "--generated-at")
      : new Date().toISOString(),
    encryptedCredentials: encryptedRows.map(row => row.encryptedCredential),
  });
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
} catch {
  process.stderr.write(
    "Backup manifest generation failed. Check metadata options and database access; no credential data was written to logs.\n",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
