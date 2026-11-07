import { describe, expect, it } from "vitest";
import {
  checkCredentialKeyRetirement,
  createCredentialBackupManifest,
  type CredentialBackupManifest,
} from "./customerCredentialBackupManifest";

const generatedAt = "2026-11-07T15:00:00.000Z";
const retainedUntil = "2026-12-07T00:00:00.000Z";
const checkedAt = "2026-11-08T00:00:00.000Z";

function manifest(snapshotId: string, encryptedCredentials: string[]): CredentialBackupManifest {
  return createCredentialBackupManifest({
    snapshotId,
    generatedAt,
    retentionExpiresAt: retainedUntil,
    encryptedCredentials,
  });
}

describe("customer credential backup manifests", () => {
  it("contains only envelope metadata and detects legacy, v2 IDs, and unknown envelopes", () => {
    const plaintext = "synthetic-customer-credential-that-must-not-leak";
    const encryptedCredentials = [
      "v1.nonce.tag.ciphertext",
      "v2.previous-key.nonce.tag.ciphertext",
      "v2.previous-key.other-nonce.other-tag.other-ciphertext",
      "v2.current_key.nonce.tag.ciphertext",
      "future.opaque.envelope",
    ];
    const result = createCredentialBackupManifest({
      snapshotId: "snapshot:opaque-123",
      generatedAt,
      retentionExpiresAt: retainedUntil,
      encryptedCredentials,
    });

    expect(result).toEqual({
      schemaVersion: 1,
      snapshotId: "snapshot:opaque-123",
      generatedAt,
      retentionExpiresAt: retainedUntil,
      envelopeVersions: { v1: 1, v2: 3, unknown: 1 },
      v2KeyIds: ["current_key", "previous-key"],
      legacyV1Present: true,
    });
    expect(JSON.stringify(result)).not.toContain(plaintext);
    for (const envelope of encryptedCredentials) {
      expect(JSON.stringify(result)).not.toContain(envelope);
    }
  });

  it("blocks retiring a key needed by an unexpired snapshot and reports missing escrow", () => {
    const backup = manifest("snapshot-a", [
      "v2.retiring-key.nonce.tag.ciphertext",
      "v2.other-key.nonce.tag.ciphertext",
    ]);
    const result = checkCredentialKeyRetirement({
      targetKeyId: "retiring-key",
      manifests: [backup],
      escrowInventory: { keyIds: ["other-key"], legacyV1Available: false },
      checkedAt,
    });

    expect(result.retirementAllowed).toBe(false);
    expect(result.retainedSnapshots).toEqual([{
      snapshotId: "snapshot-a",
      retentionExpiresAt: retainedUntil,
      requiresTargetKey: true,
      requiresLegacySecret: false,
      hasUnknownEnvelopes: false,
    }]);
    expect(result.missingEscrowKeyIds).toEqual(["retiring-key"]);
    expect(result.blockedReasons).toHaveLength(2);
  });

  it("requires the legacy secret and blocks unknown envelope versions", () => {
    const legacyAndUnknown = manifest("snapshot-b", [
      "v1.nonce.tag.ciphertext",
      "future.opaque.envelope",
    ]);
    const result = checkCredentialKeyRetirement({
      targetKeyId: "unused-key",
      manifests: [legacyAndUnknown],
      escrowInventory: { keyIds: [], legacyV1Available: false },
      checkedAt,
    });

    expect(result.retirementAllowed).toBe(false);
    expect(result.legacyEscrowMissing).toBe(true);
    expect(result.retainedSnapshots[0]).toMatchObject({
      requiresLegacySecret: true,
      hasUnknownEnvelopes: true,
    });
    expect(result.blockedReasons).toHaveLength(2);
  });

  it("permits retirement only after every dependency expires and required keys are escrowed", () => {
    const expired = createCredentialBackupManifest({
      snapshotId: "snapshot-expired",
      generatedAt,
      retentionExpiresAt: "2026-11-07T23:59:59.000Z",
      encryptedCredentials: ["v2.retiring-key.nonce.tag.ciphertext"],
    });
    const current = manifest("snapshot-current", [
      "v2.retiring-key.nonce.tag.ciphertext",
      "v2.keep-key.nonce.tag.ciphertext",
    ]);
    const result = checkCredentialKeyRetirement({
      targetKeyId: "retiring-key",
      manifests: [expired, current],
      escrowInventory: { keyIds: ["retiring-key", "keep-key"], legacyV1Available: true },
      checkedAt,
    });

    expect(result.retirementAllowed).toBe(false);
    expect(result.expiredSnapshots).toEqual(["snapshot-expired"]);
    expect(result.retainedSnapshots[0].requiresTargetKey).toBe(true);
    expect(result.blockedReasons).toHaveLength(2);

    const afterRetentionWithoutConfirmation = checkCredentialKeyRetirement({
      targetKeyId: "retiring-key",
      manifests: [expired, current],
      escrowInventory: { keyIds: ["retiring-key", "keep-key"], legacyV1Available: true },
      checkedAt: "2026-12-08T00:00:00.000Z",
    });
    expect(afterRetentionWithoutConfirmation.retirementAllowed).toBe(false);

    const afterDeletionConfirmation = checkCredentialKeyRetirement({
      targetKeyId: "retiring-key",
      manifests: [expired, current],
      escrowInventory: { keyIds: ["retiring-key", "keep-key"], legacyV1Available: true },
      checkedAt: "2026-12-08T00:00:00.000Z",
      expiredSnapshotsDeletedConfirmed: true,
    });
    expect(afterDeletionConfirmation.retirementAllowed).toBe(true);
    expect(afterDeletionConfirmation.retainedSnapshots).toEqual([]);
  });

  it("fails closed on malformed manifests, duplicate snapshots, and secret-bearing fields", () => {
    const backup = manifest("snapshot-c", ["v2.key-one.nonce.tag.ciphertext"]);
    expect(() => checkCredentialKeyRetirement({
      targetKeyId: "key-one",
      manifests: [{ ...backup, apiKey: "must-not-be-accepted" }],
      escrowInventory: { keyIds: ["key-one"], legacyV1Available: true },
      checkedAt,
    })).toThrow("Invalid credential backup or escrow inventory.");

    expect(() => checkCredentialKeyRetirement({
      targetKeyId: "key-one",
      manifests: [backup, backup],
      escrowInventory: { keyIds: ["key-one"], legacyV1Available: true },
      checkedAt,
    })).toThrow("Invalid credential backup or escrow inventory.");

    expect(() => checkCredentialKeyRetirement({
      targetKeyId: "key-one",
      manifests: [backup],
      escrowInventory: {
        keyIds: ["key-one"],
        legacyV1Available: true,
        keyMaterial: "must-not-be-accepted",
      },
      checkedAt,
    })).toThrow("Invalid credential backup or escrow inventory.");
  });
});
