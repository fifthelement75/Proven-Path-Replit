import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MyProfileRedirect from "./my-profile";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  authContext: { current: null as Record<string, unknown> | null },
  apiFetch: vi.fn(),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/employees/me", mocks.navigate],
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuthContext: () => mocks.authContext.current,
}));

vi.mock("@/lib/api", () => ({
  apiFetch: mocks.apiFetch,
}));

vi.mock("@/components/layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

function renderProfilePage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const page = render(
    <QueryClientProvider client={queryClient}>
      <MyProfileRedirect />
    </QueryClientProvider>,
  );
  return { ...page, queryClient };
}

describe("my profile routing", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.apiFetch.mockReset();
  });

  afterEach(() => cleanup());

  it("does not route an admin before subscription status loads", () => {
    mocks.authContext.current = {
      user: { role: "admin" },
      isTeamPlan: false,
      isSubscriptionLoaded: false,
    };

    const page = renderProfilePage();

    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(page.container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it.each([
    ["team", true, "/dashboard"],
    ["non-team", false, "/billing"],
  ])("routes admins with a resolved %s plan", async (_plan, isTeamPlan, route) => {
    mocks.authContext.current = {
      user: { role: "admin" },
      isTeamPlan,
      isSubscriptionLoaded: true,
    };

    renderProfilePage();

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith(route, { replace: true });
    });
  });

  it("waits for subscription status, then routes a team-plan admin to the dashboard", async () => {
    mocks.authContext.current = {
      user: { role: "admin" },
      isTeamPlan: false,
      isSubscriptionLoaded: false,
    };

    const page = renderProfilePage();
    expect(mocks.navigate).not.toHaveBeenCalled();

    mocks.authContext.current = {
      user: { role: "admin" },
      isTeamPlan: true,
      isSubscriptionLoaded: true,
    };
    page.rerender(
      <QueryClientProvider client={page.queryClient}>
        <MyProfileRedirect />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith("/dashboard", { replace: true });
    });
  });

  it("redirects an employee to their linked profile", async () => {
    mocks.authContext.current = {
      user: { role: "employee" },
      isTeamPlan: false,
      isSubscriptionLoaded: true,
    };
    mocks.apiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 42 }),
    });

    renderProfilePage();

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith("/employees/42", { replace: true });
    });
  });

  it("shows the missing-profile state when no employee record is linked", async () => {
    mocks.authContext.current = {
      user: { role: "employee" },
      isTeamPlan: false,
      isSubscriptionLoaded: true,
    };
    mocks.apiFetch.mockResolvedValue({ ok: false, status: 404 });

    renderProfilePage();

    expect(await screen.findByText("No employee profile linked")).toBeTruthy();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
