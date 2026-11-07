import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { IntegrationError } from "./pipedreamConnect";
import { logger } from "./logger";

export type Credential = { apiKey: string } | { customerId: string; username: string; password: string };
type Keyring = { activeId: string; keys: Map<string, Buffer>; legacySecret?: string };
const keyIdPattern = /^[A-Za-z0-9_-]{1,64}$/;
const configurationError = () => new IntegrationError(503, "Customer credential encryption keys are unavailable. Contact the platform administrator.");
export type CredentialKeyringIssue =
  | "keyring_missing"
  | "keyring_invalid_json"
  | "keyring_invalid_structure"
  | "active_key_id_invalid"
  | "key_id_invalid"
  | "key_material_invalid"
  | "active_key_missing";

type KeyringInspection = {
  keyring?: Keyring;
  issue: CredentialKeyringIssue | null;
  configuredKeyCount: number;
  legacyDecryptionConfigured: boolean;
};

const reportedBlockers = new Set<string>();

function reportBlockedCredentialAccess(category: string): void {
  if (reportedBlockers.has(category)) return;
  reportedBlockers.add(category);
  logger.error(
    { category: "customer_credential_encryption_blocked", reason: category },
    "Customer credential access is blocked by encryption configuration",
  );
}

function inspectKeyring(): KeyringInspection {
  const raw = process.env.CUSTOMER_CREDENTIAL_KEYS;
  const legacySecret = process.env.CUSTOMER_CREDENTIAL_LEGACY_SECRET ?? process.env.SESSION_SECRET;
  const legacyDecryptionConfigured = Boolean(legacySecret && legacySecret.length >= 32);
  if (!raw) return { issue: "keyring_missing", configuredKeyCount: 0, legacyDecryptionConfigured };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { issue: "keyring_invalid_json", configuredKeyCount: 0, legacyDecryptionConfigured };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { issue: "keyring_invalid_structure", configuredKeyCount: 0, legacyDecryptionConfigured };
  }

  const activeId = process.env.CUSTOMER_CREDENTIAL_ACTIVE_KEY_ID ?? "";
  if (!keyIdPattern.test(activeId)) {
    return { issue: "active_key_id_invalid", configuredKeyCount: 0, legacyDecryptionConfigured };
  }

  const keys = new Map<string, Buffer>();
  for (const [id, value] of Object.entries(parsed)) {
    if (!keyIdPattern.test(id)) {
      return { issue: "key_id_invalid", configuredKeyCount: keys.size, legacyDecryptionConfigured };
    }
    if (typeof value !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(value)) {
      return { issue: "key_material_invalid", configuredKeyCount: keys.size, legacyDecryptionConfigured };
    }
    const bytes = Buffer.from(value, "base64");
    if (bytes.length !== 32 || bytes.toString("base64") !== value) {
      return { issue: "key_material_invalid", configuredKeyCount: keys.size, legacyDecryptionConfigured };
    }
    keys.set(id, bytes);
  }
  if (!keys.has(activeId)) {
    return { issue: "active_key_missing", configuredKeyCount: keys.size, legacyDecryptionConfigured };
  }
  return {
    keyring: { activeId, keys, legacySecret },
    issue: null,
    configuredKeyCount: keys.size,
    legacyDecryptionConfigured,
  };
}

// Never include configuration values or crypto/parser errors in outward errors.
export function credentialKeyring(): Keyring {
  const inspection = inspectKeyring();
  if (!inspection.keyring) throw configurationError();
  return inspection.keyring;
}

export function inspectCustomerCredentialKeyring() {
  const inspection = inspectKeyring();
  return {
    ready: Boolean(inspection.keyring),
    configurationCategory: inspection.issue,
    configuredKeyCount: inspection.configuredKeyCount,
    legacyDecryptionConfigured: inspection.legacyDecryptionConfigured,
    hasKeyId: (id: string) => Boolean(inspection.keyring?.keys.has(id)),
  };
}

export function customerCredentialsReady(): boolean {
  const inspection = inspectCustomerCredentialKeyring();
  if (!inspection.ready && inspection.configurationCategory) {
    reportBlockedCredentialAccess(inspection.configurationCategory);
  }
  return inspection.ready;
}

export function credentialContext(companyId: number, provider: string, environment: string, connectionId: number) {
  return `company:${companyId}:provider:${provider}:environment:${environment}:connection:${connectionId}`;
}

function derive(material: Buffer | string, salt: string, aad: string) {
  return Buffer.from(hkdfSync("sha256", material, salt, aad, 32));
}
function decode(value: string, size?: number) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error();
  const bytes = Buffer.from(value, "base64url");
  if (bytes.toString("base64url") !== value || (size && bytes.length !== size)) throw new Error();
  return bytes;
}

export function sealCredential(value: Credential, aad: string, ring = credentialKeyring()) {
  const header = `v2.${ring.activeId}`;
  const key = derive(ring.keys.get(ring.activeId)!, "provenpath.customer-credentials.v2", aad);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(`${header}\n${aad}`));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return [header, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function openCredential(envelope: string, aad: string, ring?: Keyring): Credential {
  let blockedCategory: string | null = null;
  try {
    const parts = envelope.split(".");
    let key: Buffer, authenticatedContext = aad, offset: number;
    if (parts[0] === "v1" && parts.length === 4) {
      // Read-only compatibility: capture the original secret explicitly before rotating SESSION_SECRET.
      const secret = ring?.legacySecret ?? process.env.CUSTOMER_CREDENTIAL_LEGACY_SECRET ?? process.env.SESSION_SECRET;
      if (!secret || secret.length < 32) {
        blockedCategory = "legacy_secret_missing";
        throw configurationError();
      }
      key = derive(secret, "provenpath.customer-credentials.v1", aad);
      offset = 1;
    } else if (parts[0] === "v2" && parts.length === 5 && keyIdPattern.test(parts[1])) {
      const inspection = ring ? undefined : inspectKeyring();
      const keyring = ring ?? inspection?.keyring;
      if (!keyring) {
        blockedCategory = inspection?.issue ?? "keyring_invalid_structure";
        throw configurationError();
      }
      const material = keyring.keys.get(parts[1]);
      if (!material) {
        blockedCategory = "historical_key_missing";
        throw configurationError();
      }
      key = derive(material, "provenpath.customer-credentials.v2", aad);
      authenticatedContext = `v2.${parts[1]}\n${aad}`;
      offset = 2;
    } else { throw new Error(); }
    const decipher = createDecipheriv("aes-256-gcm", key, decode(parts[offset], 12));
    decipher.setAAD(Buffer.from(authenticatedContext));
    decipher.setAuthTag(decode(parts[offset + 1], 16));
    return JSON.parse(Buffer.concat([decipher.update(decode(parts[offset + 2])), decipher.final()]).toString());
  } catch (error) {
    if (error instanceof IntegrationError && error.status === 503) {
      reportBlockedCredentialAccess(blockedCategory ?? "credential_decryption_configuration_unavailable");
      throw configurationError();
    }
    throw new IntegrationError(409, "The stored credential cannot be used. Contact the platform administrator or reconnect this provider.");
  }
}
