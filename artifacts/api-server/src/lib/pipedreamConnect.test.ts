import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("PIPEDREAM_CLIENT_ID", "test-client");
  vi.stubEnv("PIPEDREAM_CLIENT_SECRET", "test-secret-not-real");
  vi.stubEnv("PIPEDREAM_PROJECT_ID", "proj_test");
  vi.stubEnv("PIPEDREAM_ENVIRONMENT", "development");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

function mockRequests(account: unknown) {
  return vi.stubGlobal("fetch", vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "test-access-not-real", expires_in: 3600 })))
    .mockResolvedValueOnce(new Response(JSON.stringify(account))));
}

describe("Pipedream Connect security boundaries", () => {
  it("checks company ownership instead of trusting a client-supplied account ID", async () => {
    mockRequests({ external_id: "provenpath:company:2", app: { name_slug: "notion" }, healthy: true });
    const { verifyAccount } = await import("./pipedreamConnect");
    await expect(verifyAccount(1, "notion", "apn_other")).rejects.toMatchObject({ status: 403 });
  });
  it("refuses a healthy account authorized for a different provider", async () => {
    mockRequests({ external_id: "provenpath:company:1", app: { name_slug: "fireflies" }, healthy: true });
    const { verifyAccount } = await import("./pipedreamConnect");
    await expect(verifyAccount(1, "notion", "apn_other")).rejects.toMatchObject({ status: 403 });
  });
  it("refuses unhealthy or revoked accounts", async () => {
    mockRequests({ external_id: "provenpath:company:1", app: { name_slug: "notion" }, healthy: false, dead: true });
    const { verifyAccount } = await import("./pipedreamConnect");
    await expect(verifyAccount(1, "notion", "apn_other")).rejects.toMatchObject({ status: 409 });
  });
  it("issues a company-scoped authorization token without granting client-side action execution", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "test-access", expires_in: 3600 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { name_slug: "notion" } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ connect_link_url: "https://connect.pipedream.com/?token=test-only", expires_at: "2030-01-01T00:00:00Z" })));
    vi.stubGlobal("fetch", fetcher);
    const { createAuthorization } = await import("./pipedreamConnect");
    const result = await createAuthorization(7, "notion");
    const body = JSON.parse(fetcher.mock.calls[2][1].body);
    expect(body.external_user_id).toBe("provenpath:company:7");
    expect(body.app_id).toBe("notion");
    expect(body.scope).toBe("connect:accounts:read connect:accounts:write");
    expect(body.expires_in).toBe(600);
    expect(result.authorizationUrl).toContain("app=notion");
    expect(result).not.toHaveProperty("token");
  });
  it("does not expose provider response bodies containing sensitive data on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ error: "secret-provider-detail" }), { status: 401 })));
    const { pdRequest } = await import("./pipedreamConnect");
    try { await pdRequest("/apps/notion"); expect.fail("Expected authorization failure"); }
    catch (error) { expect((error as Error).message).not.toContain("secret-provider-detail"); }
  });
});
