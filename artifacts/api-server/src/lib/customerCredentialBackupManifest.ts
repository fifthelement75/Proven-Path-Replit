const keyIdPattern = /^[A-Za-z0-9_-]{1,64}$/;
const snapshotIdPattern = /^[A-Za-z0-9._:-]{1,128}$/;

export type CredentialBackupManifest = {
  schemaVersion: 1;
  snapshotId: string;
  generatedAt: string;
  retentionExpiresAt: string;
  envelopeVersions: { v1: number; v2: number; unknown: number };
  v2KeyIds: string[];
  legacyV1Present: boolean;
};

export type CredentialEscrowInventory = {
  keyIds: string[];
  legacyV1Available: boolean;
};

export type RetirementCheck = {
  targetKeyId: string;
  checkedAt: string;
  retirementAllowed: boolean;
  retainedSnapshots: Array<{
    snapshotId: string;
    retentionExpiresAt: string;
    requiresTargetKey: boolean;
    requiresLegacySecret: boolean;
    hasUnknownEnvelopes: boolean;
  }>;
  expiredSnapshots: string[];
  missingEscrowKeyIds: string[];
  legacyEscrowMissing: boolean;
  blockedReasons: string[];
};

function isoDate(value: string): string | undefined {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;
  return date.toISOString();
}

export function createCredentialBackupManifest(input: {
  snapshotId: string;
  generatedAt: string;
  retentionExpiresAt: string;
  encryptedCredentials: Iterable<string>;
}): CredentialBackupManifest {
  const { snapshotId } = input;
  const generatedAt = isoDate(input.generatedAt);
  const retentionExpiresAt = isoDate(input.retentionExpiresAt);
  if (!snapshotIdPattern.test(snapshotId) || !generatedAt || !retentionExpiresAt) {
    throw new Error("Invalid backup manifest metadata.");
  }

  const envelopeVersions = { v1: 0, v2: 0, unknown: 0 };
  const v2KeyIds = new Set<string>();
  for (const envelope of input.encryptedCredentials) {
    const parts = envelope.split(".");
    if (parts[0] === "v1" && parts.length === 4) {
      envelopeVersions.v1++;
    } else if (parts[0] === "v2" && parts.length === 5 && keyIdPattern.test(parts[1])) {
      envelopeVersions.v2++;
      v2KeyIds.add(parts[1]);
    } else {
      envelopeVersions.unknown++;
    }
  }

  return {
    schemaVersion: 1,
    snapshotId,
    generatedAt,
    retentionExpiresAt,
    envelopeVersions,
    v2KeyIds: [...v2KeyIds].sort(),
    legacyV1Present: envelopeVersions.v1 > 0,
  };
}

function isCredentialBackupManifest(value: unknown): value is CredentialBackupManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const manifest = value as Partial<CredentialBackupManifest>;
  if (Object.keys(value).sort().join(",") !==
      "envelopeVersions,generatedAt,legacyV1Present,retentionExpiresAt,schemaVersion,snapshotId,v2KeyIds") {
    return false;
  }
  const versions = manifest.envelopeVersions;
  return manifest.schemaVersion === 1 &&
    typeof manifest.snapshotId === "string" && snapshotIdPattern.test(manifest.snapshotId) &&
    typeof manifest.generatedAt === "string" && !!isoDate(manifest.generatedAt) &&
    typeof manifest.retentionExpiresAt === "string" && !!isoDate(manifest.retentionExpiresAt) &&
    !!versions && Number.isSafeInteger(versions.v1) && versions.v1! >= 0 &&
    Number.isSafeInteger(versions.v2) && versions.v2! >= 0 &&
    Number.isSafeInteger(versions.unknown) && versions.unknown! >= 0 &&
    Array.isArray(manifest.v2KeyIds) &&
    manifest.v2KeyIds.every(id => typeof id === "string" && keyIdPattern.test(id)) &&
    new Set(manifest.v2KeyIds).size === manifest.v2KeyIds.length &&
    ((versions.v2 === 0 && manifest.v2KeyIds.length === 0) ||
      (versions.v2! > 0 && manifest.v2KeyIds.length > 0)) &&
    typeof manifest.legacyV1Present === "boolean" &&
    manifest.legacyV1Present === (versions.v1! > 0);
}

function isCredentialEscrowInventory(value: unknown): value is CredentialEscrowInventory {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (Object.keys(value).sort().join(",") !== "keyIds,legacyV1Available") return false;
  const inventory = value as Partial<CredentialEscrowInventory>;
  return Array.isArray(inventory.keyIds) &&
    inventory.keyIds.every(id => typeof id === "string" && keyIdPattern.test(id)) &&
    new Set(inventory.keyIds).size === inventory.keyIds.length &&
    typeof inventory.legacyV1Available === "boolean";
}

export function checkCredentialKeyRetirement(input: {
  targetKeyId: string;
  manifests: unknown[];
  escrowInventory: unknown;
  checkedAt: string;
  expiredSnapshotsDeletedConfirmed?: boolean;
}): RetirementCheck {
  const checkedAt = isoDate(input.checkedAt);
  if (!keyIdPattern.test(input.targetKeyId) || !checkedAt ||
      !input.manifests.length ||
      !input.manifests.every(isCredentialBackupManifest) ||
      !isCredentialEscrowInventory(input.escrowInventory)) {
    throw new Error("Invalid credential backup or escrow inventory.");
  }

  const manifests = input.manifests as CredentialBackupManifest[];
  if (new Set(manifests.map(manifest => manifest.snapshotId)).size !== manifests.length) {
    throw new Error("Invalid credential backup or escrow inventory.");
  }
  const escrowIds = new Set(input.escrowInventory.keyIds);
  const retained = manifests.filter(manifest =>
    new Date(manifest.retentionExpiresAt).getTime() > new Date(checkedAt).getTime()
  );
  const expired = manifests.filter(manifest =>
    new Date(manifest.retentionExpiresAt).getTime() <= new Date(checkedAt).getTime()
  );
  const requiredKeyIds = new Set(retained.flatMap(manifest => manifest.v2KeyIds));
  const missingEscrowKeyIds = [...requiredKeyIds].filter(id => !escrowIds.has(id)).sort();
  const legacyEscrowMissing = retained.some(manifest => manifest.legacyV1Present) &&
    !input.escrowInventory.legacyV1Available;
  const retainedSnapshots = retained.map(manifest => ({
    snapshotId: manifest.snapshotId,
    retentionExpiresAt: manifest.retentionExpiresAt,
    requiresTargetKey: manifest.v2KeyIds.includes(input.targetKeyId),
    requiresLegacySecret: manifest.legacyV1Present,
    hasUnknownEnvelopes: manifest.envelopeVersions.unknown > 0,
  }));
  const blockedReasons = [
    retainedSnapshots.some(snapshot => snapshot.requiresTargetKey)
      ? "A retained backup still contains credentials encrypted with the target key."
      : "",
    missingEscrowKeyIds.length
      ? "One or more keys required by retained backups are absent from the escrow inventory."
      : "",
    legacyEscrowMissing
      ? "A retained backup contains legacy v1 credentials, but the legacy secret is not confirmed in escrow."
      : "",
    retainedSnapshots.some(snapshot => snapshot.hasUnknownEnvelopes)
      ? "A retained backup contains unrecognized credential envelopes; inventory is incomplete."
      : "",
    expired.length && !input.expiredSnapshotsDeletedConfirmed
      ? "Expired snapshots must be confirmed deleted or non-restorable before their manifests can be excluded from the check."
      : "",
  ].filter(Boolean);

  return {
    targetKeyId: input.targetKeyId,
    checkedAt,
    retirementAllowed: blockedReasons.length === 0,
    retainedSnapshots,
    expiredSnapshots: expired.map(manifest => manifest.snapshotId).sort(),
    missingEscrowKeyIds,
    legacyEscrowMissing,
    blockedReasons,
  };
}
