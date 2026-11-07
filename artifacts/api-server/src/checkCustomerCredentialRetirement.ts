import { readFile } from "node:fs/promises";
import { checkCredentialKeyRetirement } from "./lib/customerCredentialBackupManifest";

function parseArgs(args: string[]) {
  const manifests: string[] = [];
  let targetKeyId: string | undefined;
  let escrowPath: string | undefined;
  let expiredSnapshotsDeletedConfirmed = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--confirm-expired-snapshots-deleted" && !expiredSnapshotsDeletedConfirmed) {
      expiredSnapshotsDeletedConfirmed = true;
      continue;
    }
    const value = args[i + 1];
    if (!value || value.startsWith("--")) throw new Error();
    if (arg === "--manifest") manifests.push(value);
    else if (arg === "--key-id" && !targetKeyId) targetKeyId = value;
    else if (arg === "--escrow-inventory" && !escrowPath) escrowPath = value;
    else throw new Error();
    i++;
  }
  if (!manifests.length || !targetKeyId || !escrowPath) throw new Error();
  return { manifests, targetKeyId, escrowPath, expiredSnapshotsDeletedConfirmed };
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

try {
  const {
    manifests: paths,
    targetKeyId,
    escrowPath,
    expiredSnapshotsDeletedConfirmed,
  } = parseArgs(process.argv.slice(2));
  const [manifestValues, escrowInventory] = await Promise.all([
    Promise.all(paths.map(readJson)),
    readJson(escrowPath),
  ]);
  const result = checkCredentialKeyRetirement({
    targetKeyId,
    manifests: manifestValues,
    escrowInventory,
    checkedAt: new Date().toISOString(),
    expiredSnapshotsDeletedConfirmed,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.retirementAllowed) process.exitCode = 1;
} catch {
  process.stderr.write(
    "Credential key retirement check failed or is blocked. Verify the manifest and non-secret escrow inventory; no key material was read or logged.\n",
  );
  process.exitCode = 1;
}
