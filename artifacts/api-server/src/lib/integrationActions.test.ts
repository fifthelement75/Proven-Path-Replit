import { describe, expect, it } from "vitest";
import { extractExchangeRows, normalizeExchangeRow, validateActionProps } from "./integrationActions";

describe("provider exchange mapping and input validation", () => {
  it("unwraps meeting and paginated provider results without fabricating IDs", () => {
    const rows = extractExchangeRows({ data: { transcript: { id: "abc", summary: { overview: "A meeting." } } } });
    expect(rows).toHaveLength(1);
    expect(normalizeExchangeRow(rows[0]).summary).toBe("A meeting.");
    expect(normalizeExchangeRow({ firstName: "Unidentified" }).remoteId).toBeNull();
  });
  it("normalizes employee/candidate names and email without importing access roles", () => {
    expect(normalizeExchangeRow({ id: 4, first_name: "Sample", last_name: "Candidate", email_addresses: [{ value: "candidate@example.test" }], userRole: "admin" }))
      .toMatchObject({ remoteId: "4", name: "Sample Candidate", email: "candidate@example.test" });
  });
  it("extracts Notion block text as source notes", () => {
    expect(normalizeExchangeRow({ id: "block-one", type: "paragraph", paragraph: { rich_text: [{ plain_text: "Action item" }] } }).summary).toBe("Action item");
  });
  it("validates required fields, types and injected auth-property attempts", () => {
    const action = { key: "fixture", name: "Fixture", write: false, props: [{ name: "limit", type: "integer", label: "Limit" }] };
    expect(() => validateActionProps(action, {})).toThrow("required");
    expect(() => validateActionProps(action, { limit: "10" })).toThrow("wrong type");
    expect(() => validateActionProps(action, { limit: 10, app: { authProvisionId: "foreign" } })).toThrow("Unsupported field");
    expect(validateActionProps(action, { limit: 10 })).toEqual({ limit: 10 });
  });
});
