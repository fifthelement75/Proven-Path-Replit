// Customer authorization uses Connect OAuth, NOT the workspace REST API key.
const BASE = "https://api.pipedream.com/v1";
let cached: { token: string; until: number } | undefined;
let tokenRequest: Promise<string> | undefined;

export class IntegrationError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function connectEnvironment() {
  const environment = process.env.PIPEDREAM_ENVIRONMENT ??
    (process.env.NODE_ENV === "production" ? "production" : "development");
  if (environment !== "development" && environment !== "production") {
    throw new IntegrationError(503, "PIPEDREAM_ENVIRONMENT must be development or production.");
  }
  return environment;
}

export function companyExternalId(companyId: number) {
  return `provenpath:company:${companyId}`;
}

async function accessToken(): Promise<string> {
  if (cached && cached.until > Date.now()) return cached.token;
  if (tokenRequest) return tokenRequest;
  tokenRequest = (async () => {
    const { PIPEDREAM_CLIENT_ID: clientId, PIPEDREAM_CLIENT_SECRET: clientSecret } = process.env;
    if (!clientId || !clientSecret || !process.env.PIPEDREAM_PROJECT_ID) {
      throw new IntegrationError(503, "Customer integrations require Pipedream Connect platform configuration.");
    }
    const response = await fetch(`${BASE}/oauth/token`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
      signal: AbortSignal.timeout(15000),
    });
    // Never surface upstream response bodies: they can include credentials or PII.
    if (!response.ok) throw new IntegrationError(503, "Pipedream Connect platform authorization failed. Contact your Proven Path administrator.");
    const data = await response.json() as { access_token?: unknown; expires_in?: unknown };
    if (typeof data.access_token !== "string") throw new IntegrationError(502, "Invalid authorization response.");
    cached = { token: data.access_token, until: Date.now() + Math.max(0, Math.min(Number(data.expires_in) || 3600, 3600) - 60) * 1000 };
    return cached.token;
  })();
  try { return await tokenRequest; } finally { tokenRequest = undefined; }
}

export async function pdRequest(path: string, method = "GET", body?: unknown): Promise<any> {
  const token = await accessToken();
  const response = await fetch(`${BASE}${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "x-pd-environment": connectEnvironment() },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(35000),
  });
  if (!response.ok) {
    if (response.status === 401) cached = undefined;
    const message = response.status === 429 ? "The provider is rate limiting requests. Try again later."
      : response.status === 404 ? "This provider or account is not available in the configured Connect project."
      : response.status === 401 || response.status === 403 ? "Authorization or API permissions are missing. Reauthorize the tool and check your provider plan."
      : "The provider request failed. Check the connection and retry reads; verify writes in the provider before retrying.";
    throw new IntegrationError(response.status === 404 ? 404 : 502, message);
  }
  if (response.status === 204) return null;
  return response.json();
}

export function projectPath(path: string) {
  const id = process.env.PIPEDREAM_PROJECT_ID;
  if (!id || !/^proj_[a-zA-Z0-9]+$/.test(id)) throw new IntegrationError(503, "A valid Pipedream Connect project must be configured.");
  return `/connect/${encodeURIComponent(id)}${path}`;
}

export const PROVIDERS = {
  hris: ["workday", "bamboohr", "adp", "rippling", "gusto"],
  ats: ["greenhouse", "lever", "ashby", "icims"],
  meeting: ["fireflies", "granola", "otter", "notion"],
} as const;
export type Category = keyof typeof PROVIDERS;
export function validProvider(category: unknown, provider: unknown): category is Category {
  return typeof category === "string" && Object.hasOwn(PROVIDERS, category) &&
    typeof provider === "string" && (PROVIDERS[category as Category] as readonly string[]).includes(provider);
}

export async function listCompanyAccounts(companyId: number, provider: string) {
  const qs = new URLSearchParams({ external_user_id: companyExternalId(companyId), app: provider, limit: "100", include_credentials: "false" });
  const result = await pdRequest(projectPath(`/accounts?${qs}`));
  return (result.data ?? []).filter((a: any) =>
    a.external_id === companyExternalId(companyId) && a.app?.name_slug === provider);
}

export async function verifyAccount(companyId: number, provider: string, accountId: string) {
  const account = await pdRequest(projectPath(`/accounts/${encodeURIComponent(accountId)}?include_credentials=false`));
  if (account.external_id !== companyExternalId(companyId) || account.app?.name_slug !== provider) {
    throw new IntegrationError(403, "This account does not belong to your company and selected provider.");
  }
  if (!account.healthy || account.dead) throw new IntegrationError(409, "This account needs reauthorization in the provider.");
  return account;
}

export async function createAuthorization(companyId: number, provider: string) {
  await pdRequest(`/apps/${encodeURIComponent(provider)}`);
  const result = await pdRequest(projectPath("/tokens"), "POST", {
    external_user_id: companyExternalId(companyId), app_id: provider, expires_in: 600,
    scope: "connect:accounts:read connect:accounts:write",
  });
  const url = new URL(result.connect_link_url);
  if (url.protocol !== "https:") throw new IntegrationError(502, "Invalid authorization link.");
  url.searchParams.set("app", provider);
  return { authorizationUrl: url.toString(), expiresAt: result.expires_at, environment: connectEnvironment() };
}
