import { beforeEach, describe, expect, it, vi } from "vitest";
import { pdRequest } from "./pipedreamConnect";
import { firefliesActions, readFirefliesMeetings, verifyFirefliesAccess } from "./firefliesMeetings";
import { extractExchangeRows, getExchangeActions, normalizeExchangeRow, executeExchangeAction } from "./integrationActions";

vi.mock("./pipedreamConnect", async original => ({
  ...await original<typeof import("./pipedreamConnect")>(),
  projectPath: (path: string) => `/connect/proj_test${path}`,
  pdRequest: vi.fn(),
}));

const transcript = { id: "source-meeting", title: "Coaching", date: 1793836800000,
  summary: { overview: "Discussed next quarter.", action_items: "Prepare the plan." } };
beforeEach(() => vi.resetAllMocks());

describe("Fireflies provider-backed reads", () => {
  it("offers bounded read operations without depending on the component registry", async () => {
    expect(await getExchangeActions("fireflies")).toEqual(firefliesActions);
    expect(firefliesActions.every(a => !a.write)).toBe(true);
    expect(pdRequest).not.toHaveBeenCalled();
  });
  it("routes a fixed GraphQL query through the company's vaulted account", async () => {
    vi.mocked(pdRequest).mockResolvedValueOnce({ data: { transcripts: [transcript] } });
    const result = await executeExchangeAction(42, "apn_company42", firefliesActions[0], { limit: 10, skip: 20 });
    const [path, method, body] = vi.mocked(pdRequest).mock.calls[0];
    expect(path).toContain(Buffer.from("https://api.fireflies.ai/graphql").toString("base64url"));
    expect(path).toContain("external_user_id=provenpath%3Acompany%3A42");
    expect(path).toContain("account_id=apn_company42");
    expect(method).toBe("POST");
    expect(body).toMatchObject({ variables: { limit: 10, skip: 20 } });
    expect((body as any).query).toContain("action_items");
    expect(normalizeExchangeRow(extractExchangeRows(result)[0])).toMatchObject({
      remoteId: "source-meeting", summary: "Discussed next quarter.",
      actionItems: "Prepare the plan.", date: "2026-11-05T00:00:00.000Z",
    });
  });
  it("binds transcript IDs as variables, not interpolated GraphQL", async () => {
    vi.mocked(pdRequest).mockResolvedValueOnce({ data: { transcript } });
    const id = 'id"){ mutation';
    await readFirefliesMeetings(42, "apn_company42", "fireflies-read-meeting", { meetingId: id });
    const body = vi.mocked(pdRequest).mock.calls[0][2] as any;
    expect(body.variables).toEqual({ id });
    expect(body.query).not.toContain(id);
  });
  it.each([{ limit: 51 }, { limit: 0 }, { skip: -1 }, { skip: 0.5 }, { limit: "10" }])("rejects unsafe pagination %j", async props => {
    await expect(readFirefliesMeetings(42, "apn_company42", "fireflies-read-meetings", props)).rejects.toThrow("limit");
    expect(pdRequest).not.toHaveBeenCalled();
  });
  it.each([
    { errors: [{ message: "secret provider error" }], data: { transcripts: [transcript] } },
    { data: { transcripts: null } }, {},
  ])("rejects failed/partial GraphQL reads without leaking response data", async response => {
    vi.mocked(pdRequest).mockResolvedValueOnce(response);
    await expect(verifyFirefliesAccess(42, "apn_company42")).rejects.toThrow("Fireflies could not read");
  });
  it("accepts an authorized account with no meetings", async () => {
    vi.mocked(pdRequest).mockResolvedValueOnce({ data: { transcripts: [] } });
    await expect(verifyFirefliesAccess(42, "apn_company42")).resolves.toBeUndefined();
  });
  it("does not invent dates when the source timestamp is missing or invalid", () => {
    expect(normalizeExchangeRow({ id: "a", date: NaN }).date).toBeUndefined();
    expect(normalizeExchangeRow({ id: "b", date: 1e30 }).date).toBeUndefined();
  });
});
