import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { IntegrationConnection } from "@workspace/api-client-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IntegrationSync } from "./integration-sync";

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json" } });

const conn = (category: string, status = "connected"): IntegrationConnection =>
  ({ id: 7, category, provider: "bamboohr", status, accountLabel: null, connectedAt: "2026-01-01T00:00:00Z" });

const actions = [
  { key: "list", name: "List employees", write: false, props: [] },
  { key: "bamboohr-update-employee", name: "Update employee", write: true, props: [{ name: "employeeId", label: "ID", type: "string" }, { name: "jobTitle", label: "Title", type: "string" }] },
  { key: "greenhouse-create-candidate", name: "Create candidate", write: true, props: [] },
  { key: "lever-add-note", name: "Append note", write: true, props: [] },
];

let statusBody: Record<string, unknown>;
let posts: Record<string, unknown>[];
let statusGets: number;
const fetchMock = vi.fn<typeof fetch>();

function setup(c = conn("hris")) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><IntegrationSync connection={c} onClose={() => {}} /></QueryClientProvider>);
}

beforeEach(() => {
  statusBody = { enabled: false, lastSyncAt: null, nextSyncAt: null };
  posts = []; statusGets = 0;
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.includes("/integrations/exchange/7")) return json({ environment: "development", actions, runs: [] });
    if (url.includes("/integrations/sync/7")) {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        posts.push(body);
        if (body.command === "preview") return json({ ...statusBody, previewId: "pv-1", preview: [
          { remoteId: "r1", values: { name: "Ada Okafor", email: "ada@x.io" }, ownership: { name: "provider" } },
          { remoteId: "r2", error: "Missing email for new employee" },
        ] });
        if (body.command === "approve") statusBody = { ...statusBody, enabled: true };
        if (body.command === "disable") statusBody = { ...statusBody, enabled: false };
        return json(statusBody);
      }
      statusGets++;
      return json(statusBody);
    }
    return json({}, 404);
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); fetchMock.mockReset(); });

async function fillAndPreview() {
  const select = await screen.findByTestId("select-sync-action");
  fireEvent.change(select, { target: { value: "list" } });
  fireEvent.change(screen.getByTestId("input-sync-field-name"), { target: { value: "$name" } });
  fireEvent.click(screen.getByTestId("button-sync-preview"));
  await screen.findByTestId("row-sync-preview-0");
}

describe("IntegrationSync", () => {
  it("flattens preview values, shows row errors, and does not require email", async () => {
    setup();
    await fillAndPreview();
    expect(posts[0].command).toBe("preview");
    expect(screen.getByText("Ada Okafor")).toBeTruthy();
    expect(screen.getByTestId("text-sync-preview-error-1").textContent).toContain("Missing email");
    expect(screen.queryByTestId("text-sync-error")).toBeNull();
  });

  it("invalidates the preview when the configuration changes", async () => {
    setup();
    await fillAndPreview();
    fireEvent.change(screen.getByTestId("input-sync-field-role"), { target: { value: "job.title" } });
    await waitFor(() => expect(screen.queryByTestId("button-sync-approve")).toBeNull());
  });

  it("approves without confirmOutbound when no outbound mapping", async () => {
    setup();
    await fillAndPreview();
    fireEvent.click(screen.getByTestId("button-sync-approve"));
    await waitFor(() => expect(posts.some(p => p.command === "approve")).toBe(true));
    const approve = posts.find(p => p.command === "approve")!;
    expect(approve).toEqual({ command: "approve", previewId: "pv-1" });
  });

  it("requires the separate outbound checkbox and sends confirmOutbound:true", async () => {
    setup();
    const select = await screen.findByTestId("select-sync-action");
    fireEvent.change(select, { target: { value: "list" } });
    fireEvent.change(screen.getByTestId("input-sync-field-role"), { target: { value: "$role" } });
    fireEvent.change(screen.getByTestId("select-sync-owner-role"), { target: { value: "local" } });
    fireEvent.change(screen.getByTestId("select-sync-outbound"), { target: { value: "bamboohr-update-employee" } });
    const selects = screen.getAllByRole("combobox").filter(s => (s as HTMLSelectElement).querySelector('option[value="remoteId"]'));
    fireEvent.change(selects[0], { target: { value: "remoteId" } });
    fireEvent.change(selects[1], { target: { value: "role" } });
    fireEvent.click(screen.getByTestId("button-sync-preview"));
    await screen.findByTestId("checkbox-sync-outbound-approve");
    expect(posts[0].config).toMatchObject({ outbound: { actionKey: "bamboohr-update-employee", fields: { employeeId: "remoteId", jobTitle: "role" } } });

    fireEvent.click(screen.getByTestId("button-sync-approve"));
    expect(posts.some(p => p.command === "approve")).toBe(false);
    expect(screen.getByTestId("text-sync-error")).toBeTruthy();

    fireEvent.click(screen.getByTestId("checkbox-sync-outbound-approve"));
    fireEvent.click(screen.getByTestId("button-sync-approve"));
    await waitFor(() => expect(posts.find(p => p.command === "approve")).toEqual({ command: "approve", previewId: "pv-1", confirmOutbound: true }));
  });

  it("polls status every 15 seconds and can disable even when unverified", async () => {
    statusBody = { enabled: true, lastSyncAt: "2026-01-02T10:00:00Z", nextSyncAt: "2026-01-02T11:00:00Z" };
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setup(conn("ats", "needs_authorization"));
    await screen.findByText("Enabled");
    expect(screen.queryByTestId("button-sync-preview")).toBeNull();
    const before = statusGets;
    await act(async () => { await vi.advanceTimersByTimeAsync(15500); });
    await waitFor(() => expect(statusGets).toBeGreaterThan(before));
    fireEvent.click(screen.getByTestId("button-sync-disable"));
    await waitFor(() => expect(posts.at(-1)).toEqual({ command: "disable" }));
    await screen.findByText("Disabled");
  });
});
