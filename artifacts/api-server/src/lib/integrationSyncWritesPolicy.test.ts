import { describe, expect, it } from "vitest";
import { assertAutomaticUpdate } from "./integrationSyncWritesPolicy";
describe("verified automatic record updates", () => {
  it("rejects create/append actions regardless of claimed targeting or new payloads", () => {
    for (const [provider, actionKey] of [["greenhouse", "greenhouse-create-candidate"], ["ashby", "ashby-create-candidate"], ["lever", "lever-add-note"]]) {
      expect(() => assertAutomaticUpdate(provider, { actionKey, props: {}, fields: { id: "remoteId", name: "name" } })).toThrow("manually confirmed");
    }
  });
  it("requires the verified provider, exact field semantics and stable remote identity", () => {
    const update = { actionKey: "bamboohr-update-employee", props: {}, fields: { employeeId: "remoteId", jobTitle: "role" } };
    expect(() => assertAutomaticUpdate("bamboohr", update)).not.toThrow();
    expect(() => assertAutomaticUpdate("workday", update)).toThrow("not a verified");
    expect(() => assertAutomaticUpdate("bamboohr", { ...update, fields: { jobTitle: "role" } })).toThrow("stable remoteId");
    expect(() => assertAutomaticUpdate("bamboohr", { ...update, fields: { ...update.fields, jobTitle: "email" } })).toThrow("corresponding");
    expect(() => assertAutomaticUpdate("bamboohr", { ...update, props: { employeeId: "other-record" } })).toThrow("Static");
    expect(() => assertAutomaticUpdate("workday", { actionKey: "workday-change-business-title", props: {},
      fields: { workerId: "remoteId", proposedBusinessTitle: "role" } })).not.toThrow();
  });
});
