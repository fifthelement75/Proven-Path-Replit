import { pdRequest, projectPath, companyExternalId, IntegrationError } from "./pipedreamConnect";
import { firefliesActions, readFirefliesMeetings } from "./firefliesMeetings";

type Prop = { name: string; type: string; label?: string; description?: string; optional?: boolean; options?: unknown[] };
export type ExchangeAction = {
  key: string; name: string; write: boolean; props: Prop[]; version?: string;
  appProp?: string; direct?: boolean;
};
// Deliberately exclude deletes, compensation/payroll and broad workflow execution.
const KEYS: Record<string, string[]> = {
  workday: ["workday-search-workers", "workday-get-worker", "workday-change-business-title"],
  bamboohr: ["bamboohr-get-employees-directory", "bamboohr-get-employee", "bamboohr-update-employee"],
  rippling: ["rippling-list-workers", "rippling-list-users"],
  greenhouse: ["greenhouse-create-candidate"],
  lever: ["lever-list-opportunities", "lever-get-opportunity", "lever-add-note"],
  ashby: ["ashby-search-candidates", "ashby-get-candidate", "ashby-create-candidate"],
  fireflies: ["fireflies-list-meeting-id-options", "fireflies-find-meeting-by-id", "fireflies-find-recent-meeting", "fireflies-update-meeting"],
  granola: ["granola-list-notes", "granola-get-note"],
  notion: ["notion-search", "notion-retrieve-page", "notion-retrieve-block", "notion-append-block", "notion-create-comment"],
};
const WRITE_KEYS = new Set([
  "workday-change-business-title", "bamboohr-update-employee", "greenhouse-create-candidate",
  "lever-add-note", "ashby-create-candidate", "fireflies-update-meeting",
  "notion-append-block", "notion-create-comment",
]);
const DIRECT: Record<string, ExchangeAction[]> = {
  adp: [{ key: "adp-read-workers", name: "Read workers", write: false, direct: true, props: [
    { name: "skip", label: "Records to skip", type: "integer", optional: true },
  ] }],
  gusto: [{ key: "gusto-read-employees", name: "Read employees", write: false, direct: true, props: [
    { name: "companyId", label: "Gusto company UUID", type: "string" },
    { name: "page", label: "Page", type: "integer", optional: true },
  ] }],
  greenhouse: [{ key: "greenhouse-read-candidates", name: "Read candidates", write: false, direct: true, props: [
    { name: "page", label: "Page", type: "integer", optional: true },
  ] }],
  lever: [{ key: "lever-read-opportunities", name: "Read opportunities", write: false, direct: true, props: [
    { name: "offset", label: "Next-page offset", type: "string", optional: true },
  ] }],
};
const actionCache = new Map<string, { until: number; actions: ExchangeAction[] }>();

export async function getExchangeActions(provider: string): Promise<ExchangeAction[]> {
  // This adapter reads documented fields directly, independent of registry actions.
  if (provider === "fireflies") return firefliesActions;
  const key = projectPath(`/${provider}`);
  const entry = actionCache.get(key);
  if (entry && entry.until > Date.now()) return entry.actions;
  const result = await pdRequest(projectPath(`/components?${new URLSearchParams({
    app: provider, component_type: "action", limit: "100", registry: "public",
  })}`));
  const actions: ExchangeAction[] = (result.data ?? [])
    .filter((a: any) => KEYS[provider]?.includes(a.key))
    .flatMap((a: any) => {
      const appProps = a.configurable_props?.filter((p: any) => p.type === "app");
      if (appProps?.length !== 1 || appProps[0].app !== provider) return [];
      return [{
        key: a.key, name: a.name, version: a.version, appProp: appProps[0].name,
        write: WRITE_KEYS.has(a.key),
        props: a.configurable_props.filter((p: any) =>
          ["string", "integer", "boolean", "object", "string[]", "integer[]"].includes(p.type))
          .map((p: any) => ({
            name: p.name, label: p.label ?? p.name, type: p.type,
            description: p.description, optional: p.optional === true, options: p.options,
          })),
      }];
    });
  actions.push(...(DIRECT[provider] ?? []));
  actionCache.set(key, { until: Date.now() + 300000, actions });
  return actions;
}

export function validateActionProps(action: ExchangeAction, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new IntegrationError(400, "Action fields must be an object.");
  const input = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const name of Object.keys(input)) {
    if (!action.props.some(p => p.name === name)) throw new IntegrationError(400, `Unsupported field: ${name}`);
  }
  for (const prop of action.props) {
    const v = input[prop.name];
    if (v === undefined || v === "") {
      if (!prop.optional) throw new IntegrationError(400, `${prop.label} is required.`);
      continue;
    }
    const valid = prop.type === "string" ? typeof v === "string"
      : prop.type === "integer" ? Number.isSafeInteger(v)
      : prop.type === "boolean" ? typeof v === "boolean"
      : prop.type.endsWith("[]") ? Array.isArray(v) && v.every(x =>
        prop.type === "string[]" ? typeof x === "string" : Number.isSafeInteger(x))
      : v !== null && typeof v === "object" && !Array.isArray(v);
    if (!valid) throw new IntegrationError(400, `${prop.label} has the wrong type.`);
    result[prop.name] = v;
  }
  if (JSON.stringify(result).length > 60000) throw new IntegrationError(400, "Action fields are too large.");
  return result;
}

export async function executeExchangeAction(companyId: number, accountId: string, action: ExchangeAction, props: Record<string, unknown>) {
  if (firefliesActions.some(a => a.key === action.key)) {
    return readFirefliesMeetings(companyId, accountId, action.key, props);
  }
  if (action.direct) {
    let url: string;
    switch (action.key) {
      case "adp-read-workers":
        if (props.skip !== undefined && (Number(props.skip) < 0 || Number(props.skip) > 1000000)) throw new IntegrationError(400, "Invalid offset.");
        url = `https://api.adp.com/hr/v2/workers?$top=100&$skip=${props.skip ?? 0}`; break;
      case "gusto-read-employees":
        if (!/^[a-zA-Z0-9-]{1,100}$/.test(String(props.companyId))) throw new IntegrationError(400, "Invalid Gusto company ID.");
        url = `/v1/companies/${props.companyId}/employees?per=100&page=${positivePage(props.page)}`; break;
      case "greenhouse-read-candidates":
        url = `/v1/candidates?per_page=100&page=${positivePage(props.page)}`; break;
      case "lever-read-opportunities":
        url = `/v1/opportunities?limit=100${props.offset ? `&offset=${encodeURIComponent(String(props.offset))}` : ""}`; break;
      default: throw new IntegrationError(400, "Unsupported operation.");
    }
    return pdRequest(projectPath(`/proxy/${Buffer.from(url).toString("base64url")}?${new URLSearchParams({
      external_user_id: companyExternalId(companyId), account_id: accountId,
    })}`));
  }
  const response = await pdRequest(projectPath("/actions/run"), "POST", {
    id: action.key, version: action.version, external_user_id: companyExternalId(companyId),
    configured_props: { ...props, [action.appProp!]: { authProvisionId: accountId } },
  });
  if (response.error || response.os?.some((x: any) => x.err)) {
    throw new IntegrationError(502, "The tool reported an operation error. Check provider permissions and required fields. Verify writes at the provider before retrying.");
  }
  const result = response.ret ?? null;
  if (result?.error || result?.errors?.length || result?.success === false) {
    throw new IntegrationError(502, "The provider rejected this operation. Check permissions and required fields; verify write outcomes before retrying.");
  }
  return result;
}

function positivePage(v: unknown) {
  if (v === undefined) return 1;
  if (!Number.isSafeInteger(v) || Number(v) < 1 || Number(v) > 100000) throw new IntegrationError(400, "Invalid page.");
  return Number(v);
}

export function extractExchangeRows(data: any): Record<string, any>[] {
  if (Array.isArray(data)) return data.filter(x => x && typeof x === "object" && !Array.isArray(x)).slice(0,250);
  if (!data || typeof data !== "object") return [];
  for (const key of ["employees", "workers", "candidates", "notes", "opportunities", "transcripts", "transcript", "note", "results", "data"]) {
    if (Array.isArray(data[key])) return extractExchangeRows(data[key]);
    if (data[key] && typeof data[key] === "object") {
      const rows = extractExchangeRows(data[key]); if (rows.length) return rows;
    }
  }
  return data.id || data.uuid || data.employeeId || data.associateOID ? [data] : [];
}

function text(...values: unknown[]) { return values.find(v => typeof v === "string" && v.trim()) as string | undefined; }
function meetingDate(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
export function normalizeExchangeRow(row: Record<string, any>) {
  const id = row.id ?? row.uuid ?? row.employeeId ?? row.associateOID;
  const first = text(row.firstName, row.first_name, row.personal_info?.first_name, row.person?.legalName?.givenName);
  const last = text(row.lastName, row.last_name, row.personal_info?.last_name, row.person?.legalName?.familyName1);
  const email = text(row.workEmail, row.email, row.work_email, row.emailAddresses?.[0]?.value,
    row.email_addresses?.[0]?.value, row.emails?.[0], row.contact?.emails?.[0]?.value);
  return {
    remoteId: id == null ? null : String(id),
    name: text(row.name, row.displayName, row.contact?.name, first || last ? [first,last].filter(Boolean).join(" ") : undefined, row.descriptor),
    email, role: text(row.jobTitle, row.jobTitleName, row.title, row.role, row.job_title),
    department: text(row.department, row.departmentName, row.department?.name),
    level: text(row.level, row.level?.name),
    startDate: text(row.hireDate, row.start_date, row.startDate),
    title: text(row.title, row.name),
    summary: text(row.summary, row.summary?.overview, row.summary?.short_summary, row.notes, row.content,
      row.type && Array.isArray(row[row.type]?.rich_text)
        ? row[row.type].rich_text.map((part: any) => part.plain_text ?? part.text?.content ?? "").join("") : undefined),
    actionItems: text(row.summary?.action_items, row.action_items),
    date: text(row.dateString, row.date, meetingDate(row.date), row.created_at, row.createdAt, row.created_time),
  };
}
