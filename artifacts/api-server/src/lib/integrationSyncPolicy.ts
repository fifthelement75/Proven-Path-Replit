import { createHash } from "node:crypto";
import { normalizeExchangeRow } from "./integrationActions";
import { IntegrationError } from "./pipedreamConnect";

export type SyncConfig = {
  actionKey: string; props: Record<string, unknown>;
  fields: Record<string, { source: string; owner: "provider" | "local" }>;
  intervalMinutes: number;
  pagination: { mode: "single" | "page" | "offset" | "cursor"; prop?: string; nextPath?: string; pageSize?: number };
  updatedAtPath?: string;
  updatedSinceProp?: string;
  outbound?: { actionKey: string; props: Record<string, unknown>; fields: Record<string, string> };
};
export const localFields = (kind: string) => kind === "hris"
  ? ["name", "email", "role", "department", "level", "startDate"] : ["name", "email", "role"];
const blocked = new Set(["__proto__", "prototype", "constructor"]);
export function pathValue(row: any, path: string): unknown {
  if (!path || path.length > 200) return undefined;
  return path.split(".").reduce((v, key) => !blocked.has(key) && v != null &&
    Object.prototype.hasOwnProperty.call(Object(v), key) ? v[key] : undefined, row);
}
export function hashPayload(value: unknown): string {
  const stable = (v: any): any => v && typeof v === "object"
    ? Array.isArray(v) ? v.map(stable) : Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])])) : v;
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}
export function validateSyncConfig(config: SyncConfig, kind: string) {
  if (!["hris", "ats"].includes(kind)) throw new IntegrationError(400, "Automatic sync is only available for HRIS employees and ATS candidates.");
  const allowed = localFields(kind);
  if (!Number.isInteger(config.intervalMinutes) || config.intervalMinutes < 15 || config.intervalMinutes > 1440 ||
      !Object.keys(config.fields).length || Object.keys(config.fields).some(k => !allowed.includes(k))) {
    throw new IntegrationError(400, "Choose supported fields and a schedule from 15 to 1440 minutes.");
  }
  for (const mapping of Object.values(config.fields)) {
    if (!mapping.source || mapping.source.length > 200 || !["provider", "local"].includes(mapping.owner)) {
      throw new IntegrationError(400, "Each field requires a source path and explicit ownership.");
    }
  }
  const p = config.pagination;
  if (p.mode !== "single" && !p.prop) throw new IntegrationError(400, "Choose the provider pagination input field.");
  if (p.mode === "cursor" && !p.nextPath) throw new IntegrationError(400, "Choose the next-page cursor result path.");
  if (config.updatedSinceProp && (!config.updatedAtPath || config.updatedSinceProp === p.prop)) {
    throw new IntegrationError(400, "Incremental provider input needs a timestamp output mapping separate from pagination.");
  }
  if (p.mode !== "single" && (!p.pageSize || p.pageSize < 1 || p.pageSize > 250)) throw new IntegrationError(400, "Provide the provider's actual page size (1–250).");
  if (config.outbound) {
    if (!Object.keys(config.outbound.fields).length) throw new IntegrationError(400, "Approve outbound field mappings separately.");
    for (const source of Object.values(config.outbound.fields)) {
      if (source !== "remoteId" && (!allowed.includes(source) || config.fields[source]?.owner !== "local")) {
        throw new IntegrationError(400, "Outbound fields must be explicitly owned by Proven Path.");
      }
    }
  }
}
export function mappedRecord(raw: Record<string, any>, config: SyncConfig) {
  const normalized = normalizeExchangeRow(raw);
  if (!normalized.remoteId || normalized.remoteId.length > 500) throw new IntegrationError(422, "The record needs a stable remote identity.");
  const values: Record<string, string> = {};
  for (const [field, mapping] of Object.entries(config.fields)) {
    const value = mapping.source.startsWith("$")
      ? pathValue(normalized, mapping.source.slice(1)) : pathValue(raw, mapping.source);
    if (value == null || value === "") {
      if (mapping.owner === "provider") throw new IntegrationError(422, `The provider-owned ${field} value is missing. Review the source path or remove this optional field mapping.`);
      continue;
    }
    if (typeof value !== "string" || value.length > 500) throw new IntegrationError(422, `The ${field} mapping must return text of at most 500 characters.`);
    values[field] = field === "email" ? value.trim().toLowerCase() : value.trim();
  }
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) throw new IntegrationError(422, "The email mapping is invalid.");
  if (values.startDate && (!/^\d{4}-\d{2}-\d{2}$/.test(values.startDate) ||
      !Number.isFinite(Date.parse(values.startDate)) || new Date(values.startDate).toISOString().slice(0, 10) !== values.startDate)) {
    throw new IntegrationError(422, "The startDate mapping must return a valid YYYY-MM-DD date.");
  }
  return { remoteId: normalized.remoteId, values };
}

// A provider-owned field changed locally since the last applied source snapshot:
// keep the local value and report a conflict instead of silently overwriting it.
export function planInbound(current: Record<string, any>, incoming: Record<string, string>,
  baseline: Record<string, string> | null, config: SyncConfig) {
  const changes: Record<string, string> = {};
  const conflicts: string[] = [];
  for (const [field, mapping] of Object.entries(config.fields)) {
    if (mapping.owner !== "provider" || incoming[field] === undefined) continue;
    const local = String(current[field] ?? "");
    const prior = baseline?.[field];
    if (local !== incoming[field] && (prior === undefined || local !== prior)) conflicts.push(field);
    else changes[field] = incoming[field];
  }
  return { changes, conflicts };
}
export function pageAfter(result: any, count: number, config: SyncConfig, page: unknown) {
  const p = config.pagination;
  if (count > 250 || (p.mode !== "single" && count > p.pageSize!)) throw new IntegrationError(422, "The provider page exceeds the approved page size. Correct pagination before syncing.");
  if (p.mode === "single") {
    if (count >= 250) throw new IntegrationError(422, "This result may be truncated. Configure provider pagination before syncing.");
    return null;
  }
  if (p.mode === "cursor") {
    const next = pathValue(result, p.nextPath!);
    if (next === undefined && count >= p.pageSize!) throw new IntegrationError(422, "The full page has no configured next cursor. Check the provider's result path before continuing.");
    if (next == null || next === "") return null;
    if (!["string", "number"].includes(typeof next) || String(next).length > 2000 || String(next) === String(page)) {
      throw new IntegrationError(422, "The provider returned an invalid or repeated pagination cursor.");
    }
    return next;
  }
  return count < p.pageSize! ? null : Number(page ?? (p.mode === "page" ? 1 : 0)) + (p.mode === "page" ? 1 : p.pageSize!);
}
export async function safeRead<T>(read: () => Promise<T>, sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))) {
  for (let attempt = 0; ; attempt++) {
    try { return await read(); }
    catch (err) {
      const status = err instanceof IntegrationError ? err.status : 502;
      if (attempt >= 2 || (status !== 429 && status < 500)) throw err;
      await sleep(status === 429 ? 60000 : 1000 * 2 ** attempt);
    }
  }
}
