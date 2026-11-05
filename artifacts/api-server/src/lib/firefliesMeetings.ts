import { companyExternalId, IntegrationError, pdRequest, projectPath } from "./pipedreamConnect";
import type { ExchangeAction } from "./integrationActions";

// Fixed, read-only queries. Never accept a URL, GraphQL document or auth fields
// from the browser. Pipedream keeps each company's provider credential in its vault.
export const firefliesActions: ExchangeAction[] = [
  { key: "fireflies-read-meetings", name: "Fireflies meeting summaries and action items", write: false, direct: true, props: [
    { name: "limit", label: "Meetings per page (1–50, default 20)", type: "integer", optional: true },
    { name: "skip", label: "Meetings to skip (default 0)", type: "integer", optional: true },
  ] },
  { key: "fireflies-read-meeting", name: "Fireflies meeting by ID", write: false, direct: true, props: [
    { name: "meetingId", label: "Fireflies transcript ID", type: "string" },
  ] },
];

const FIELDS = "id title date summary { overview short_summary action_items }";

export async function readFirefliesMeetings(companyId: number, accountId: string, key: string, props: Record<string, unknown>) {
  let query: string;
  let variables: Record<string, unknown>;
  if (key === "fireflies-read-meetings") {
    const limit = props.limit ?? 20, skip = props.skip ?? 0;
    if (!Number.isSafeInteger(limit) || Number(limit) < 1 || Number(limit) > 50 ||
        !Number.isSafeInteger(skip) || Number(skip) < 0 || Number(skip) > 1000000) {
      throw new IntegrationError(400, "Use a limit of 1–50 and a skip of 0–1000000.");
    }
    query = `query ProvenPathMeetings($limit: Int, $skip: Int) { transcripts(limit: $limit, skip: $skip) { ${FIELDS} } }`;
    variables = { limit, skip };
  } else if (key === "fireflies-read-meeting") {
    if (typeof props.meetingId !== "string" || !props.meetingId.trim() || props.meetingId.length > 256) {
      throw new IntegrationError(400, "Provide a Fireflies transcript ID of up to 256 characters.");
    }
    query = `query ProvenPathMeeting($id: String!) { transcript(id: $id) { ${FIELDS} } }`;
    variables = { id: props.meetingId.trim() };
  } else {
    throw new IntegrationError(400, "Unsupported Fireflies operation.");
  }
  const target = Buffer.from("https://api.fireflies.ai/graphql").toString("base64url");
  const result = await pdRequest(projectPath(`/proxy/${target}?${new URLSearchParams({
    external_user_id: companyExternalId(companyId), account_id: accountId,
  })}`), "POST", { query, variables });
  // GraphQL can return HTTP 200 with partial data and authorization errors.
  // Do not persist partial responses or expose upstream error messages.
  if (!result || result.errors?.length || !result.data ||
      (key === "fireflies-read-meetings" ? !Array.isArray(result.data.transcripts) : !result.data.transcript?.id)) {
    throw new IntegrationError(502, "Fireflies could not read these meetings. Check the transcript ID, API access, provider plan and account authorization.");
  }
  return result;
}

export async function verifyFirefliesAccess(companyId: number, accountId: string) {
  await readFirefliesMeetings(companyId, accountId, "fireflies-read-meetings", { limit: 1 });
}
