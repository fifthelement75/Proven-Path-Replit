import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import type { IntegrationConnection } from "@workspace/api-client-react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setToken } from "@/lib/auth";
import SettingsPage from "./settings";

const mocks = vi.hoisted(() => ({ toast: vi.fn() }));

// Only the signed-in context and surrounding layout are fixtures. The Settings
// page, Radix controls, React Query, and authenticated apiFetch remain real.
vi.mock("@/contexts/AuthContext", () => ({
  useAuthContext: () => ({ user: { id: 1, companyId: 1, role: "admin" } }),
}));
vi.mock("@/components/layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

const providerLabels = {
  fireflies: "Fireflies.ai",
  granola: "Granola",
  otter: "Otter.ai",
  notion: "Notion",
};
type Provider = keyof typeof providerLabels;
type Failure = "http" | "network";

function connection(provider: Provider, id: number): IntegrationConnection {
  return {
    id, category: "meeting", provider, status: "connected",
    accountLabel: `${provider} workspace`, connectedAt: "2026-01-02T12:00:00Z",
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json" },
  });
}

let savedConnections: IntegrationConnection[];
let savedMembers: Array<{ id: number; name: string; email: string; userRole: string; managerId: number | null; managerName: string | null }>;
let failure: { path: string; kind: Failure } | undefined;
let clients: QueryClient[];
const fetchMock = vi.fn<typeof fetch>();

function renderSettings() {
  // A fresh client and component mount simulate reload without React state or
  // query-cache persistence; only the mock server's saved records survive.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>
      <SettingsPage />
    </QueryClientProvider>,
  );
}

async function meetingCard() {
  const title = await screen.findByText("Meeting Intelligence");
  const card = title.closest(".rounded-xl");
  if (!(card instanceof HTMLElement)) throw new Error("Meeting card not found");
  return within(card);
}

async function openProviderSelector() {
  const card = await meetingCard();
  fireEvent.keyDown(card.getByRole("combobox"), { key: "Enter" });
  return within(await screen.findByRole("listbox"));
}

function requestCount(path: string) {
  return fetchMock.mock.calls.filter(([url]) => url === `/api${path}`).length;
}

describe("Settings meeting connections", () => {
  const scrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
  beforeAll(() => {
    // Radix scrolls the active option into view; jsdom has no layout engine.
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true, value: vi.fn(),
    });
  });
  afterAll(() => {
    if (scrollIntoView) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", scrollIntoView);
    else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
  });

  beforeEach(() => {
    savedConnections = [connection("fireflies", 11), connection("granola", 12)];
    savedMembers = [];
    failure = undefined;
    clients = [];
    mocks.toast.mockReset();
    setToken("test-session-fixture");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (url, init) => {
      const path = String(url).replace(/^\/api/, "");
      if (failure?.path === path) {
        if (failure.kind === "network") throw new TypeError("Failed to fetch");
        return json({ message: "Provider service unavailable" }, 503);
      }
      switch (path) {
        case "/integrations":
          return json({ connections: savedConnections });
        case "/integrations/exchange/catalog":
          return json({
            environment: "development",
            providers: Object.keys(providerLabels).map(provider => ({ provider, available: true })),
          });
        case "/integrations/sync-key":
          return json({ syncKey: null });
        case "/employees":
          return json(savedMembers);
        case "/invitations":
          return json([]);
        case "/integrations/disconnect": {
          const body = JSON.parse(String(init?.body));
          savedConnections = savedConnections.filter(
            c => c.category !== body.category || c.provider !== body.provider,
          );
          return json({ success: true });
        }
        case "/integrations/authorize":
          return json({ authorizationUrl: "https://example.test/authorize", environment: "development" });
        case "/integrations/connect": {
          const body = JSON.parse(String(init?.body));
          const saved = { ...connection(body.provider, 13), accountLabel: body.accountLabel ?? null };
          savedConnections.push(saved);
          return json({ connection: saved });
        }
        default:
          throw new Error(`Unexpected Settings request: ${init?.method ?? "GET"} ${url}`);
      }
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    clients.forEach(client => client.clear());
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows multiple saved providers and excludes them from the real add selector", async () => {
    renderSettings();
    const card = await meetingCard();
    expect(card.getByText("Fireflies.ai")).toBeTruthy();
    expect(card.getByText("Granola")).toBeTruthy();
    expect(card.getByText("fireflies workspace · Authorized Jan 2, 2026")).toBeTruthy();
    expect(card.getByText("granola workspace · Authorized Jan 2, 2026")).toBeTruthy();
    expect(card.getByText("2 authorized")).toBeTruthy();
    const options = await openProviderSelector();
    expect(options.getAllByRole("option").map(o => o.textContent)).toEqual(["Otter.ai", "Notion"]);
    // The real request wrapper still sends the signed-in fixture token.
    const [, init] = fetchMock.mock.calls.find(([url]) => url === "/api/integrations")!;
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer test-session-fixture");
  });

  it("switches between the reporting list and real employee hierarchy without losing panel collapse behavior", async () => {
    savedMembers = [
      { id: 1, name: "Team Lead", email: "lead@example.test", userRole: "admin", managerId: null, managerName: null },
      { id: 2, name: "Direct Report", email: "report@example.test", userRole: "employee", managerId: 1, managerName: "Team Lead" },
    ];
    renderSettings();
    const teamToggle = await screen.findByRole("button", { name: /Team members/ });
    if (teamToggle.getAttribute("aria-expanded") !== "true") fireEvent.click(teamToggle);
    fireEvent.click(await screen.findByRole("button", { name: "Reporting structure" }));
    expect(screen.getByRole("button", { name: "List", pressed: true })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Org chart" }));
    expect(screen.getByRole("button", { name: "Org chart", pressed: true })).toBeTruthy();
    const reports = screen.getByRole("list", { name: "Direct reports of Team Lead" });
    expect(within(reports).getByText("Direct Report")).toBeTruthy();
    expect(screen.getByTestId("badge-org-role-1").textContent).toBe("Administrator");
    fireEvent.click(screen.getByRole("button", { name: "List" }));
    expect(screen.queryByTestId("org-chart")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Reporting structure" }));
    expect(screen.queryByRole("button", { name: "Org chart" })).toBeNull();
    fireEvent.click(teamToggle);
    expect(teamToggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("disconnects only the selected provider, restores its option, and retains the other after reload", async () => {
    const page = renderSettings();
    const card = await meetingCard();
    fireEvent.click(card.getByRole("button", { name: "Disconnect Fireflies.ai" }));
    await waitFor(() => expect(card.queryByRole("button", { name: "Disconnect Fireflies.ai" })).toBeNull());
    expect(card.getByRole("button", { name: "Disconnect Granola" })).toBeTruthy();
    expect(card.getByText("1 authorized")).toBeTruthy();
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("Disconnect fireflies?"));
    expect(fetchMock).toHaveBeenCalledWith("/api/integrations/disconnect", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ category: "meeting", provider: "fireflies" }),
    }));
    expect(requestCount("/integrations")).toBe(2);
    const options = await openProviderSelector();
    expect(options.getAllByRole("option").map(o => o.textContent)).toEqual(["Fireflies.ai", "Otter.ai", "Notion"]);
    page.unmount();
    renderSettings();
    const reloaded = await meetingCard();
    expect(reloaded.queryByRole("button", { name: "Disconnect Fireflies.ai" })).toBeNull();
    expect(reloaded.getByRole("button", { name: "Disconnect Granola" })).toBeTruthy();
    expect(requestCount("/integrations")).toBe(3);
  });

  it("reloads all saved connections with a fresh query cache", async () => {
    const page = renderSettings();
    await meetingCard();
    page.unmount();
    renderSettings();
    const card = await meetingCard();
    expect(card.getByRole("button", { name: "Disconnect Fireflies.ai" })).toBeTruthy();
    expect(card.getByRole("button", { name: "Disconnect Granola" })).toBeTruthy();
    expect(requestCount("/integrations")).toBe(2);
  });

  it("hides the entire add form with all four providers and restores it after targeted removal", async () => {
    savedConnections = (Object.keys(providerLabels) as Provider[]).map((provider, i) => connection(provider, i + 1));
    renderSettings();
    const card = await meetingCard();
    expect(card.getByText("4 authorized")).toBeTruthy();
    expect(card.queryByRole("combobox")).toBeNull();
    expect(card.queryByPlaceholderText("Account or workspace (optional)")).toBeNull();
    expect(card.queryByRole("button", { name: "Authorize" })).toBeNull();
    fireEvent.click(card.getByRole("button", { name: "Disconnect Notion" }));
    await waitFor(() => expect(card.getByRole("combobox")).toBeTruthy());
    expect(card.getAllByRole("button", { name: /^Disconnect / })).toHaveLength(3);
    const options = await openProviderSelector();
    expect(options.getAllByRole("option").map(o => o.textContent)).toEqual(["Notion"]);
  });

  it("does not disconnect when confirmation is cancelled", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    renderSettings();
    const card = await meetingCard();
    fireEvent.click(card.getByRole("button", { name: "Disconnect Fireflies.ai" }));
    expect(requestCount("/integrations/disconnect")).toBe(0);
    expect(card.getByText("2 authorized")).toBeTruthy();
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it.each<Failure>(["http", "network"])("reports a %s disconnect failure without removing either provider", async kind => {
    failure = { path: "/integrations/disconnect", kind };
    renderSettings();
    const card = await meetingCard();
    fireEvent.click(card.getByRole("button", { name: "Disconnect Fireflies.ai" }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({
      title: "Could not disconnect", variant: "destructive",
      description: kind === "http" ? "Provider service unavailable" : "Network error. Please try again.",
    }));
    expect(card.getByRole("button", { name: "Disconnect Fireflies.ai" }).hasAttribute("disabled")).toBe(false);
    expect(card.getByRole("button", { name: "Disconnect Granola" })).toBeTruthy();
    expect(card.getByText("2 authorized")).toBeTruthy();
    expect(requestCount("/integrations")).toBe(1);
    const options = await openProviderSelector();
    expect(options.getAllByRole("option").map(o => o.textContent)).toEqual(["Otter.ai", "Notion"]);
  });

  it.each<Failure>(["http", "network"])("reports a %s connection-list failure", async kind => {
    failure = { path: "/integrations", kind };
    renderSettings();
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({
      title: "Could not load integrations", description: "Please refresh the page.", variant: "destructive",
    }));
    expect(screen.queryByText("Loading integrations...")).toBeNull();
    expect(screen.queryByRole("button", { name: "Disconnect Fireflies.ai" })).toBeNull();
  });

  it("reports catalog failure and disables authorization while keeping saved connections visible", async () => {
    failure = { path: "/integrations/exchange/catalog", kind: "http" };
    renderSettings();
    const card = await meetingCard();
    expect(await card.findByRole("alert")).toHaveProperty("textContent", "Provider service unavailable");
    expect(card.getByRole("button", { name: "Authorize" }).hasAttribute("disabled")).toBe(true);
    expect(card.getByText("2 authorized")).toBeTruthy();
  });

  it.each(["authorize", "connect"] as const)("reports failed %s requests without replacing saved connections", async step => {
    failure = { path: `/integrations/${step}`, kind: "http" };
    renderSettings();
    const options = await openProviderSelector();
    fireEvent.click(options.getByRole("option", { name: "Notion" }));
    const card = await meetingCard();
    await waitFor(() => expect(card.getByRole("button", { name: "Authorize" }).hasAttribute("disabled")).toBe(false));
    fireEvent.click(card.getByRole("button", { name: "Authorize" }));
    if (step === "connect") {
      fireEvent.click(await card.findByRole("button", { name: "Verify connection" }));
    }
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({
      title: step === "authorize" ? "Authorization unavailable" : "Could not connect",
      description: "Provider service unavailable", variant: "destructive",
    }));
    expect(card.getByText("2 authorized")).toBeTruthy();
    expect(card.queryByRole("button", { name: "Disconnect Notion" })).toBeNull();
    expect(requestCount("/integrations")).toBe(1);
  });

  it("adds a verified provider alongside saved connections and preserves all three after reload", async () => {
    const page = renderSettings();
    const options = await openProviderSelector();
    fireEvent.click(options.getByRole("option", { name: "Notion" }));
    const card = await meetingCard();
    fireEvent.change(card.getByPlaceholderText("Account or workspace (optional)"), { target: { value: "Notes workspace" } });
    await waitFor(() => expect(card.getByRole("button", { name: "Authorize" }).hasAttribute("disabled")).toBe(false));
    fireEvent.click(card.getByRole("button", { name: "Authorize" }));
    expect(await card.findByRole("link", { name: "Open secure authorization" })).toHaveProperty("href", "https://example.test/authorize");
    fireEvent.click(card.getByRole("button", { name: "Verify connection" }));
    await waitFor(() => expect(card.getByText("3 authorized")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith("/api/integrations/connect", expect.objectContaining({
      method: "POST", body: JSON.stringify({ category: "meeting", provider: "notion", accountLabel: "Notes workspace" }),
    }));
    expect(card.queryByRole("button", { name: "Verify connection" })).toBeNull();
    page.unmount();
    renderSettings();
    const reloaded = await meetingCard();
    for (const name of ["Fireflies.ai", "Granola", "Notion"]) {
      expect(reloaded.getByRole("button", { name: `Disconnect ${name}` })).toBeTruthy();
    }
    expect(reloaded.getByText(/Notes workspace · Authorized/)).toBeTruthy();
    const remaining = await openProviderSelector();
    expect(remaining.getAllByRole("option").map(o => o.textContent)).toEqual(["Otter.ai"]);
  });
});
