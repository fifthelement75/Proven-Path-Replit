import { describe, it, expect, vi } from "vitest";
import { hashPayload, mappedRecord, pageAfter, pathValue, planInbound, safeRead, validateSyncConfig, type SyncConfig } from "./integrationSyncPolicy";
import { IntegrationError } from "./pipedreamConnect";

const config: SyncConfig = {
  actionKey: "read", props: {}, intervalMinutes: 15, pagination: { mode: "page", prop: "page", pageSize: 2 },
  fields: { name: { source: "$name", owner: "provider" }, role: { source: "job.title", owner: "local" } },
};
describe("automatic sync safety policy", () => {
  it("maps provider paths while blocking prototype traversal and fabricated identities", () => {
    expect(mappedRecord({ id: 1, name: "Person", job: { title: "Engineer" } }, config))
      .toEqual({ remoteId: "1", values: { name: "Person", role: "Engineer" } });
    expect(pathValue({}, "__proto__.constructor")).toBeUndefined();
    expect(() => mappedRecord({ name: "Person" }, config)).toThrow("stable");
  });
  it("updates provider-owned fields only and reports concurrent local edits", () => {
    expect(planInbound({ name: "Before", role: "Local" }, { name: "After", role: "Remote" }, { name: "Before" }, config))
      .toEqual({ changes: { name: "After" }, conflicts: [] });
    expect(planInbound({ name: "Local edit" }, { name: "After" }, { name: "Before" }, config).conflicts).toEqual(["name"]);
    expect(planInbound({ name: "Existing" }, { name: "After" }, null, config).conflicts).toEqual(["name"]);
  });
  it("paginates numeric and cursor APIs without accepting silent truncation or cursor loops", () => {
    expect(pageAfter({}, 2, config, 1)).toBe(2);
    expect(pageAfter({}, 1, config, 2)).toBeNull();
    const token = { ...config, pagination: { mode: "cursor" as const, prop: "offset", nextPath: "next", pageSize: 2 } };
    expect(pageAfter({ next: "abc" }, 2, token, undefined)).toBe("abc");
    expect(() => pageAfter({ next: "abc" }, 2, token, "abc")).toThrow("repeated");
    expect(() => pageAfter({}, 251, config, 1)).toThrow("exceeds");
  });
  it("never permits meeting sync or outbound provider-owned fields", () => {
    expect(() => validateSyncConfig(config, "meeting")).toThrow("only");
    expect(() => validateSyncConfig({ ...config, outbound: { actionKey: "write", props: {}, fields: { name: "name" } } }, "ats")).toThrow("owned");
    expect(() => validateSyncConfig({ ...config, outbound: { actionKey: "write", props: {}, fields: { title: "role", id: "remoteId" } } }, "ats")).not.toThrow();
  });
  it("retries rate limited/transient safe reads with backoff, not revoked accounts", async () => {
    const read = vi.fn().mockRejectedValueOnce(new IntegrationError(429, "limited"))
      .mockRejectedValueOnce(new IntegrationError(502, "transient")).mockResolvedValue("ok");
    const sleep = vi.fn(async () => {});
    expect(await safeRead(read, sleep)).toBe("ok");
    expect(sleep.mock.calls).toEqual([[60000], [2000]]);
    const revoked = vi.fn().mockRejectedValue(new IntegrationError(403, "revoked"));
    await expect(safeRead(revoked, sleep)).rejects.toThrow("revoked");
    expect(revoked).toHaveBeenCalledTimes(1);
  });
  it("hashes field mappings and payloads deterministically", () => {
    expect(hashPayload({ a: 1, b: 2 })).toBe(hashPayload({ b: 2, a: 1 }));
  });
  it("reports missing provider-owned values instead of silently keeping stale data", () => {
    expect(() => mappedRecord({ id: "one" }, config)).toThrow("provider-owned name");
    expect(mappedRecord({ id: "one", name: "Employee" }, config).values).toEqual({ name: "Employee" });
  });
});
