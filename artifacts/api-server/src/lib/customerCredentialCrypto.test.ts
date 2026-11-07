import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCipheriv, hkdfSync, randomBytes } from "node:crypto";
import {
  credentialContext,
  customerCredentialsReady,
  inspectCustomerCredentialKeyring,
  openCredential,
  sealCredential,
} from "./customerCredentialCrypto";

const old = Buffer.alloc(32, 1).toString("base64"), next = Buffer.alloc(32, 2).toString("base64");
const legacy = "test-only-legacy-session-secret-more-than-32-characters";
const value = { apiKey: "fake-credential-never-real" };
const aad = credentialContext(1, "otter", "development", 2);
function legacyEnvelope(context = aad) {
  const key = Buffer.from(hkdfSync("sha256", legacy, "provenpath.customer-credentials.v1", context, 32));
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context));
  const data = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}
function configure(active = "old", keys: Record<string, string> = { old, next }) {
  vi.stubEnv("CUSTOMER_CREDENTIAL_KEYS", JSON.stringify(keys));
  vi.stubEnv("CUSTOMER_CREDENTIAL_ACTIVE_KEY_ID", active);
}
beforeEach(() => {
  configure();
  vi.stubEnv("SESSION_SECRET", legacy);
  vi.stubEnv("CUSTOMER_CREDENTIAL_LEGACY_SECRET", legacy);
});
afterEach(() => vi.unstubAllEnvs());

describe("credential key lifecycle", () => {
  it("writes only the explicit active key, retains old reads and is independent of session rotation", () => {
    const first = sealCredential(value, aad);
    configure("next");
    vi.stubEnv("SESSION_SECRET", "different-session-secret");
    const second = sealCredential(value, aad);
    expect(first).toMatch(/^v2.old\./);
    expect(second).toMatch(/^v2.next\./);
    expect(openCredential(first, aad)).toEqual(value);
    expect(openCredential(second, aad)).toEqual(value);
    configure("old"); // Roll back the active ID without dropping the newly used key.
    expect(openCredential(second, aad)).toEqual(value);
    expect(sealCredential(value, aad)).toMatch(/^v2.old\./);
    expect(second).not.toContain(value.apiKey);
    expect(sealCredential(value, aad)).not.toBe(second);
    configure("next", { next });
    expect(openCredential(second, aad)).toEqual(value);
    expect(() => openCredential(first, aad)).toThrow(expect.objectContaining({ status: 503 }));
  });
  it("reads legacy envelopes with the captured original session secret and never writes v1", () => {
    const envelope = legacyEnvelope();
    vi.stubEnv("SESSION_SECRET", "rotated-session");
    expect(openCredential(envelope, aad)).toEqual(value);
    expect(sealCredential(openCredential(envelope, aad), aad)).toMatch(/^v2.old\./);
    vi.stubEnv("CUSTOMER_CREDENTIAL_LEGACY_SECRET", "");
    expect(() => openCredential(envelope, aad)).toThrow();
  });
  it("allows legacy read-only access before dedicated keys are installed", () => {
    vi.stubEnv("CUSTOMER_CREDENTIAL_KEYS", "");
    expect(customerCredentialsReady()).toBe(false);
    expect(openCredential(legacyEnvelope(), aad)).toEqual(value);
    delete process.env.CUSTOMER_CREDENTIAL_LEGACY_SECRET; // Original deployments have only SESSION_SECRET.
    expect(openCredential(legacyEnvelope(), aad)).toEqual(value);
    expect(() => sealCredential(value, aad)).toThrow();
  });
  it.each([
    ["", "old"], ["{}", "old"], ["not-json-secret", "old"], ['{"old":"short-secret"}', "old"],
    [JSON.stringify({ old }), "missing"], [JSON.stringify({ "invalid.id": old }), "old"],
    [JSON.stringify([old]), "old"],
  ])("fails closed and redacts invalid configuration", (keys, active) => {
    vi.stubEnv("CUSTOMER_CREDENTIAL_KEYS", keys);
    vi.stubEnv("CUSTOMER_CREDENTIAL_ACTIVE_KEY_ID", active);
    expect(customerCredentialsReady()).toBe(false);
    expect(() => sealCredential(value, aad)).toThrow("Customer credential encryption keys are unavailable.");
  });
  it.each([
    ["", "old", "keyring_missing"],
    ["not-json-secret", "old", "keyring_invalid_json"],
    ["[]", "old", "keyring_invalid_structure"],
    ['{"old":"short-secret"}', "old", "key_material_invalid"],
    [JSON.stringify({ old }), "missing", "active_key_missing"],
    [JSON.stringify({ old }), "invalid.id", "active_key_id_invalid"],
    [JSON.stringify({ "invalid.id": old }), "old", "key_id_invalid"],
  ])("classifies blocked keyring setup as %s", (keys, active, category) => {
    vi.stubEnv("CUSTOMER_CREDENTIAL_KEYS", keys);
    vi.stubEnv("CUSTOMER_CREDENTIAL_ACTIVE_KEY_ID", active);
    expect(inspectCustomerCredentialKeyring()).toMatchObject({
      ready: false,
      configurationCategory: category,
    });
  });
  it.each([
    credentialContext(3, "otter", "development", 2),
    credentialContext(1, "icims", "development", 2),
    credentialContext(1, "otter", "production", 2),
    credentialContext(1, "otter", "development", 3),
  ])("rejects a mismatched binding for both envelope versions", context => {
    for (const envelope of [sealCredential(value, aad), legacyEnvelope()]) {
      expect(() => openCredential(envelope, context)).toThrow(expect.objectContaining({ status: 409 }));
    }
  });
  it("authenticates key IDs, version, nonce, tag and ciphertext and rejects malformed envelopes", () => {
    configure("old", { old, alias: old }); // Even an alias with identical material cannot change the header.
    const envelope = sealCredential(value, aad);
    for (let index = 0; index < 5; index++) {
      const parts = envelope.split(".");
      parts[index] = index === 0 ? "v3" : index === 1 ? "alias" :
        Buffer.alloc(index === 2 ? 12 : index === 3 ? 16 : 32).toString("base64url");
      expect(() => openCredential(parts.join("."), aad)).toThrow();
    }
    for (const malformed of [envelope + ".", envelope + ".extra", "v2.old...", "v1...", ""]) {
      expect(() => openCredential(malformed, aad)).toThrow();
    }
  });
});
