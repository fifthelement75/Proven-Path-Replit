import { db, integrationConnectionsTable, integrationCredentialsTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { connectEnvironment, IntegrationError } from "./pipedreamConnect";
import type { ExchangeAction } from "./integrationActions";
import { credentialContext as context, customerCredentialsReady, sealCredential, openCredential, type Credential } from "./customerCredentialCrypto";
export { customerCredentialsReady, sealCredential, openCredential } from "./customerCredentialCrypto";

export const CUSTOMER_PROVIDERS = {
  otter: {
    category: "meeting", requirements: "Otter Enterprise workspace with Public API access. Create a dedicated key under Otter Integrations → Developer.",
    docs: "https://help.otter.ai/hc/en-us/articles/36130822688279-Otter-ai-Public-API",
  },
  icims: {
    category: "ats", requirements: "An iCIMS-provisioned customer API integration account using Basic authentication, customer ID, and Integration User group Search/Profiles read permissions. Portal login credentials do not work. OAuth-only accounts are not supported by this adapter.",
    docs: "https://developer-community.icims.com/getting-started/integrating-icims",
  },
} as const;
export type CustomerProvider = keyof typeof CUSTOMER_PROVIDERS;
export function isCustomerProvider(value: unknown): value is CustomerProvider {
  return typeof value === "string" && Object.hasOwn(CUSTOMER_PROVIDERS, value);
}
export function parseCustomerCredential(provider: CustomerProvider, input: Record<string, unknown>): Credential {
  if (provider === "otter") {
    if (typeof input.apiKey !== "string" || !/^\S{1,4096}$/.test(input.apiKey)) throw new IntegrationError(400, "Provide a valid Otter API key.");
    if (input.username || input.password || input.customerId) throw new IntegrationError(400, "Otter uses an API key, not iCIMS credentials.");
    return { apiKey: input.apiKey };
  }
  if (input.apiKey || typeof input.customerId !== "string" || !/^[1-9]\d{0,11}$/.test(input.customerId) ||
    typeof input.username !== "string" || !input.username.trim() || input.username.includes(":") || input.username.length > 500 ||
    typeof input.password !== "string" || !input.password || input.password.length > 4096) {
    throw new IntegrationError(400, "Provide the iCIMS customer ID and provisioned API integration username/password.");
  }
  return { customerId: input.customerId, username: input.username, password: input.password };
}

async function vendorRead(provider: CustomerProvider, credential: Credential, path: string) {
  const otter = provider === "otter";
  if (otter !== ("apiKey" in credential)) throw new IntegrationError(409, "Reconnect this provider.");
  const url = otter ? `https://api.otter.ai/v1${path}`
    : `https://api.icims.com/customers/${(credential as Exclude<Credential, { apiKey: string }>).customerId}${path}`;
  const authorization = "apiKey" in credential ? `Bearer ${credential.apiKey}`
    : `Basic ${Buffer.from(`${credential.username}:${credential.password}`).toString("base64")}`;
  let response: Response;
  try {
    response = await fetch(url, { headers: { Authorization: authorization, Accept: "application/json" },
      redirect: "error", signal: AbortSignal.timeout(15000) });
  } catch { throw new IntegrationError(502, "The provider could not be reached securely. Try again later."); }
  if (!response.ok) {
    const status = response.status;
    throw new IntegrationError(status === 401 || status === 403 ? 409 : status === 429 ? 429 : status === 404 ? 422 : 502,
      status === 401 ? "The provider rejected or revoked this credential. Reconnect with a valid credential."
        : status === 403 ? "This account lacks API access or required read permissions. Check the provider plan and integration permissions."
        : status === 429 ? "The provider is rate limiting requests. Try again later."
        : status === 404 ? "The provider API or requested record is unavailable for this account."
        : "The provider request failed. Try again later.");
  }
  try {
    if (Number(response.headers.get("content-length")) > 2_000_000) throw new Error("Too large");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Missing response");
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 2_000_000) { await reader.cancel(); throw new Error("Too large"); }
      chunks.push(part.value);
    }
    const data = JSON.parse(Buffer.concat(chunks).toString());
    if (!data || typeof data !== "object" || data.errors || data.error) throw new Error("Invalid API response");
    return data;
  } catch { throw new IntegrationError(502, "The provider returned an unsupported response. Check that this account has the documented API access."); }
}
async function health(provider: CustomerProvider, credential: Credential) {
  const result = await vendorRead(provider, credential, provider === "otter" ? "/conversations?limit=1"
    : `/search/people?${new URLSearchParams({ searchJson: JSON.stringify({ filters: [{ name: "person.id", value: ["1"], operator: "=" }], operator: "&" }) })}`);
  if (!Array.isArray(provider === "otter" ? result.data : result.searchResults)) {
    throw new IntegrationError(422, "This account does not support the required provider API.");
  }
}
export async function saveCustomerCredential(companyId: number, provider: CustomerProvider, input: Record<string, unknown>) {
  if (!customerCredentialsReady()) throw new IntegrationError(503, "Customer credential encryption is not configured.");
  const credential = parseCustomerCredential(provider, input);
  await health(provider, credential); // Failed reauthorization never replaces a working credential.
  const environment = connectEnvironment(), category = CUSTOMER_PROVIDERS[provider].category;
  return db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(${companyId}, 1094)`);
    const [current] = await tx.select().from(integrationConnectionsTable).where(and(
      eq(integrationConnectionsTable.companyId, companyId), eq(integrationConnectionsTable.category, category),
      ...(category === "meeting" ? [eq(integrationConnectionsTable.provider, provider)] : []),
    ));
    if (current && current.provider !== provider) throw new IntegrationError(409, "Disconnect the current ATS provider before connecting iCIMS.");
    const values = { companyId, category, provider, status: "connected", brokerEnvironment: environment,
      accountLabel: typeof input.accountLabel === "string" ? input.accountLabel.trim().slice(0,120) || null : null,
      connectedAt: new Date(), updatedAt: new Date() };
    const [connection] = current
      ? await tx.update(integrationConnectionsTable).set(values).where(eq(integrationConnectionsTable.id, current.id)).returning()
      : await tx.insert(integrationConnectionsTable).values(values).returning();
    await tx.update(integrationConnectionsTable).set({ brokerAccountId: `direct:${connection.id}` }).where(eq(integrationConnectionsTable.id, connection.id));
    const encryptedCredential = sealCredential(credential, context(companyId, provider, environment, connection.id));
    await tx.insert(integrationCredentialsTable).values({ connectionId: connection.id, companyId, provider, environment, encryptedCredential })
      .onConflictDoUpdate({ target: integrationCredentialsTable.connectionId, set: { encryptedCredential, environment, updatedAt: new Date() } });
    return { ...connection, brokerAccountId: `direct:${connection.id}` };
  });
}
async function load(companyId: number, provider: CustomerProvider, accountId: string) {
  if (!/^direct:[1-9]\d*$/.test(accountId)) throw new IntegrationError(409, "Reconnect this provider using customer API credentials.");
  const [row] = await db.select().from(integrationCredentialsTable).where(and(
    eq(integrationCredentialsTable.connectionId, Number(accountId.slice(7))), eq(integrationCredentialsTable.companyId, companyId),
    eq(integrationCredentialsTable.provider, provider), eq(integrationCredentialsTable.environment, connectEnvironment()),
  ));
  if (!row) throw new IntegrationError(404, "This company has no credential for the selected provider and environment.");
  return openCredential(row.encryptedCredential, context(companyId, provider, row.environment, row.connectionId));
}
export async function verifyCustomerAccount(companyId: number, provider: CustomerProvider, accountId: string) {
  await health(provider, await load(companyId, provider, accountId));
}
export const customerActions: Record<CustomerProvider, ExchangeAction[]> = {
  otter: [
    { key: "otter-list-conversations", name: "Read conversations (20 per page)", write: false, props: [{ name: "cursor", label: "Next-page cursor", type: "string", optional: true }] },
    { key: "otter-get-conversation", name: "Read conversation details", write: false, props: [{ name: "conversationId", label: "Conversation ID", type: "string" }] },
  ],
  icims: [
    { key: "icims-get-person", name: "Read person profile", write: false, props: [{ name: "profileId", label: "Person profile ID", type: "integer" }] },
    { key: "icims-get-job", name: "Read job profile (reference only)", write: false, props: [{ name: "profileId", label: "Job profile ID", type: "integer" }] },
  ],
};
export async function executeCustomerRead(companyId: number, provider: CustomerProvider, accountId: string, actionKey: string, props: Record<string, unknown>) {
  if (!customerActions[provider].some(a => a.key === actionKey)) throw new IntegrationError(400, "Unsupported provider operation.");
  const credential = await load(companyId, provider, accountId);
  if (provider === "otter") {
    if (actionKey === "otter-list-conversations") {
      if (props.cursor && (typeof props.cursor !== "string" || props.cursor.length > 2000)) throw new IntegrationError(400, "Invalid cursor.");
      return vendorRead(provider, credential, `/conversations?${new URLSearchParams({ limit: "20", ...(props.cursor ? { cursor: String(props.cursor) } : {}) })}`);
    }
    if (typeof props.conversationId !== "string" || !/^[\w-]{1,200}$/.test(props.conversationId)) throw new IntegrationError(400, "Invalid conversation ID.");
    return vendorRead(provider, credential, `/conversations/${encodeURIComponent(props.conversationId)}?include=action_items`);
  }
  if (!Number.isSafeInteger(props.profileId) || Number(props.profileId) < 1) throw new IntegrationError(400, "Invalid profile ID.");
  const result = await vendorRead(provider, credential, `/${actionKey === "icims-get-person" ? "people" : "jobs"}/${props.profileId}`);
  // Numeric IDs are unique only within an iCIMS customer. Namespace them so a
  // later tenant change cannot overwrite an import from another customer.
  if ("apiKey" in credential) throw new IntegrationError(409, "Reconnect iCIMS.");
  return actionKey === "icims-get-person"
    ? { ...result, providerId: result.id ?? props.profileId, id: `icims:${credential.customerId}:people:${props.profileId}`,
      name: [result.firstname, result.lastname].filter(v => typeof v === "string" && v).join(" ") }
    : { ...result, providerId: result.id ?? props.profileId, id: undefined };
}
