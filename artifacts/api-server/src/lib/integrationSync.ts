import { randomUUID } from "node:crypto";
import { and, eq, desc, sql, inArray } from "drizzle-orm";
import {
  db, integrationConnectionsTable as connections, integrationSyncTable as syncs,
  integrationSyncWritesTable as writes, integrationImportsTable as imports,
  integrationRunsTable as runs, employeesTable, candidateProfilesTable,
} from "@workspace/db";
import { connectEnvironment, verifyAccount, IntegrationError } from "./pipedreamConnect";
import { getExchangeActions, executeExchangeAction, extractExchangeRows, validateActionProps, type ExchangeAction } from "./integrationActions";
import { isCustomerProvider, customerActions, verifyCustomerAccount, executeCustomerRead } from "./customerCredentials";
import { assertEmployeeSeat, requireTeamEntitlement } from "./entitlements";
import { hashPayload, localFields, mappedRecord, pageAfter, pathValue, planInbound, safeRead, validateSyncConfig, type SyncConfig } from "./integrationSyncPolicy";
import { logger } from "./logger";
import { assertAutomaticUpdate } from "./integrationSyncWritesPolicy";

type Connection = typeof connections.$inferSelect;
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
export async function syncConnection(companyId: number, id: number) {
  const [connection] = await db.select().from(connections).where(and(eq(connections.companyId, companyId), eq(connections.id, id)));
  if (!connection) throw new IntegrationError(404, "Connection not found.");
  if (!["hris", "ats"].includes(connection.category)) throw new IntegrationError(400, "Meeting ingestion is not part of automatic sync.");
  return connection;
}
async function verify(connection: Connection) {
  if (!connection.brokerAccountId || connection.brokerEnvironment !== connectEnvironment() || connection.status !== "connected") {
    throw new IntegrationError(409, "Authorize the provider account again, then preview and approve sync.");
  }
  if (await requireTeamEntitlement(db, connection.companyId) !== "ok") throw new IntegrationError(403, "An active Team plan is required for automatic sync.");
  if (isCustomerProvider(connection.provider)) await verifyCustomerAccount(connection.companyId, connection.provider, connection.brokerAccountId);
  else await verifyAccount(connection.companyId, connection.provider, connection.brokerAccountId);
}
const actionsFor = (c: Connection) => isCustomerProvider(c.provider) ? Promise.resolve(customerActions[c.provider]) : getExchangeActions(c.provider);
async function actionFor(c: Connection, key: string, write: boolean) {
  const action = (await actionsFor(c)).find(a => a.key === key && a.write === write);
  if (!action) throw new IntegrationError(400, "This provider does not support the selected sync operation.");
  // Job profile reads are references, never candidate records.
  if (key === "icims-get-job") throw new IntegrationError(400, "Job profiles cannot be synchronized as candidates.");
  return action;
}
async function execute(c: Connection, action: ExchangeAction, props: Record<string, unknown>) {
  return isCustomerProvider(c.provider)
    ? executeCustomerRead(c.companyId, c.provider, c.brokerAccountId!, action.key, props)
    : executeExchangeAction(c.companyId, c.brokerAccountId!, action, props);
}
export async function syncStatus(c: Connection) {
  const [sync] = await db.select().from(syncs).where(and(eq(syncs.companyId, c.companyId), eq(syncs.connectionId, c.id)));
  const recent = await db.select({ id: runs.id, status: runs.status, message: runs.message, createdAt: runs.createdAt, result: runs.result })
    .from(runs).where(and(eq(runs.companyId, c.companyId), eq(runs.connectionId, c.id), eq(runs.actionKey, "automatic-sync")))
    .orderBy(desc(runs.id)).limit(10);
  const ledger = await db.select().from(writes).where(and(eq(writes.companyId, c.companyId), eq(writes.provider, c.provider)))
    .orderBy(desc(writes.id)).limit(100);
  return {
    enabled: sync?.enabled ?? false, config: sync?.config, lastSyncAt: sync?.lastSyncAt?.toISOString() ?? null,
    nextSyncAt: sync?.nextSyncAt?.toISOString() ?? null, message: sync?.message ?? null, cursor: sync?.cursor ?? {},
    issues: ((recent[0]?.result as any)?.issues ?? []).slice(0, 100), writes: ledger, runs: recent,
  };
}
export async function previewSync(c: Connection, config: SyncConfig) {
  validateSyncConfig(config, c.category);
  if (config.outbound) assertAutomaticUpdate(c.provider, config.outbound);
  await verify(c);
  const action = await actionFor(c, config.actionKey, false);
  const p = config.pagination;
  if (p.mode !== "single" && !action.props.some(a => a.name === p.prop)) throw new IntegrationError(400, "The read action does not accept that pagination field.");
  if (config.updatedSinceProp && !action.props.some(a => a.name === config.updatedSinceProp && a.type === "string")) {
    throw new IntegrationError(400, "The read action does not support that incremental timestamp input.");
  }
  if (p.mode !== "single") delete config.props[p.prop!];
  const props = pageProps(config, undefined);
  const result = await safeRead(() => execute(c, action, validateActionProps(action, props)));
  const rows = extractExchangeRows(result, 251);
  pageAfter(result, rows.length, config, props[p.prop!]);
  const preview = rows.slice(0, 10).map(raw => {
    try { return { ...mappedRecord(raw, config), ownership: Object.fromEntries(Object.entries(config.fields).map(([f, m]) => [f, m.owner])) }; }
    catch (err) { return { error: publicError(err) }; }
  });
    if (!preview.length) throw new IntegrationError(422, "No records returned. Read a representative provider page before approving mappings.");
  if (config.outbound) {
    const outbound = await actionFor(c, config.outbound.actionKey, true);
    // Outbound constants are limited to action configuration, not unowned data.
    for (const key of Object.keys(config.outbound.props)) {
      if (!["companyId", "domain", "tenant", "subdomain"].includes(key) && !config.outbound.fields[key]) {
        throw new IntegrationError(400, "Outbound data must be mapped to a locally owned field or remote identity, not supplied as a constant.");
      }
    }
    const sample: Record<string, unknown> = { ...config.outbound.props };
    for (const [prop, field] of Object.entries(config.outbound.fields)) {
      if (!outbound.props.some(p => p.name === prop)) throw new IntegrationError(400, "Unsupported outbound mapping property.");
      sample[prop] = field === "remoteId" ? "preview-id" : "preview-value";
    }
    validateActionProps(outbound, sample);
  }
  const previewId = randomUUID();
  const draft = { config, account: c.brokerAccountId, environment: c.brokerEnvironment, expiresAt: Date.now() + 15 * 60000 };
  await db.insert(syncs).values({ companyId: c.companyId, connectionId: c.id, config: config as any, draft, previewId })
    .onConflictDoUpdate({ target: syncs.connectionId, set: { draft, previewId } });
  return { ...await syncStatus(c), previewId, preview };
}
export async function approveSync(c: Connection, previewId: string, confirmOutbound = false) {
  await verify(c);
  await db.transaction(async tx => {
    const [sync] = await tx.select().from(syncs).where(and(eq(syncs.companyId, c.companyId), eq(syncs.connectionId, c.id))).for("update");
    if (!sync?.draft || sync.previewId !== previewId || sync.draft.expiresAt < Date.now() ||
        sync.draft.account !== c.brokerAccountId || sync.draft.environment !== c.brokerEnvironment) {
      throw new IntegrationError(409, "Preview the current account and mapping again before approval.");
    }
    if (sync.draft.config.outbound && !confirmOutbound) throw new IntegrationError(400, "Separately approve the reviewed outbound mappings before enabling writes.");
    if (sync.draft.config.outbound) assertAutomaticUpdate(c.provider, sync.draft.config.outbound);
    await tx.update(syncs).set({
      config: sync.draft.config, draft: null, previewId: null, enabled: true, approvedAccount: c.brokerAccountId,
      approvedAt: new Date(), nextSyncAt: new Date(), cursor: {}, message: "Approved. Waiting for the next worker pass.",
    }).where(eq(syncs.id, sync.id));
  });
}
export async function disableSync(c: Connection) {
  // Row locks serialize disable with local changes and external dispatch.
  await db.update(syncs).set({ enabled: false, nextSyncAt: null, draft: null, previewId: null, message: "Automatic sync is disabled." })
    .where(and(eq(syncs.companyId, c.companyId), eq(syncs.connectionId, c.id)));
}
function publicError(err: unknown) {
  return err instanceof IntegrationError ? err.message : "This record could not be synchronized. Check required fields, seats and provider access.";
}
function pageProps(config: SyncConfig, page: unknown, watermark?: number) {
  const p = config.pagination;
  const props = { ...config.props };
  if (p.mode !== "single") {
    const value = page ?? (p.mode === "page" ? 1 : p.mode === "offset" ? 0 : undefined);
    if (value !== undefined) props[p.prop!] = value;
  }
  if (config.updatedSinceProp && watermark) props[config.updatedSinceProp] = new Date(watermark).toISOString();
  return props;
}
async function active(tx: any, c: Connection, approval: Date) {
  const [row] = await tx.select().from(syncs).where(and(eq(syncs.companyId, c.companyId), eq(syncs.connectionId, c.id))).for("update");
  const [connection] = await tx.select().from(connections).where(and(eq(connections.companyId, c.companyId), eq(connections.id, c.id)));
  return row?.enabled && row.approvedAt?.getTime() === approval.getTime() &&
    row.approvedAccount === connection?.brokerAccountId && connection?.brokerEnvironment === connectEnvironment() &&
    connection?.status === "connected" ? row : null;
}
function localRecord(row: any, kind: string) {
  return Object.fromEntries(localFields(kind).map(f => [f, String(row[f === "role" && kind === "ats" ? "roleApplyingFor" : f] ?? "")]));
}
async function applyRecord(c: Connection, config: SyncConfig, raw: any, approval: Date) {
  const { remoteId, values } = mappedRecord(raw, config);
  return db.transaction(async tx => {
    // Same lock as reviewed imports, and durable identity independent of account ID.
    await tx.execute(sql`select pg_advisory_xact_lock(${c.companyId}, hashtext(${c.provider}))`);
    if (!await active(tx, c, approval)) throw new IntegrationError(409, "Sync stopped or its approval changed.");
    const [prior] = await tx.select().from(imports).where(and(eq(imports.companyId, c.companyId),
      eq(imports.provider, c.provider), eq(imports.kind, c.category), eq(imports.remoteId, remoteId)));
    const table = c.category === "hris" ? employeesTable : candidateProfilesTable;
    const [local] = prior ? await tx.select().from(table).where(and(eq(table.companyId, c.companyId), eq(table.id, prior.localId)))
      : values.email ? await tx.select().from(table).where(and(eq(table.companyId, c.companyId), sql`lower(${table.email}) = ${values.email}`)).limit(1) : [];
    if (prior && !local) throw new IntegrationError(409, "The mapped local record was removed. Reconcile it with a reviewed import.");
    let localId: number;
    let baseline: Record<string, string>;
    if (local) {
      const planned = planInbound(localRecord(local, c.category), values, prior?.syncBaseline ?? null, config);
      if (planned.conflicts.length) throw new IntegrationError(409, `Local edits conflict with provider ownership: ${planned.conflicts.join(", ")}. Reconcile through reviewed Data exchange.`);
      // Identity/email changes must be reviewed, never silently relink accounts.
      if (planned.changes.email && planned.changes.email !== String(local.email ?? "").toLowerCase()) {
        throw new IntegrationError(409, "Email identity changed. Reconcile the local email before syncing.");
      }
      const changes: Record<string, string> = { ...planned.changes };
      if (c.category === "ats" && changes.role !== undefined) { changes.roleApplyingFor = changes.role; delete changes.role; }
      if (Object.keys(changes).length) await tx.update(table).set(changes).where(and(eq(table.companyId, c.companyId), eq(table.id, local.id)));
      localId = local.id;
      baseline = { ...(prior?.syncBaseline ?? {}), ...planned.changes };
    } else {
      const required = c.category === "hris" ? localFields("hris") : ["name", "role"];
      if (required.some(f => config.fields[f]?.owner !== "provider" || !values[f])) {
        throw new IntegrationError(422, "New records need all required fields mapped and owned by the provider. Import manually if local defaults are needed.");
      }
      const inbound = Object.fromEntries(Object.entries(values).filter(([f]) => config.fields[f].owner === "provider"));
      if (c.category === "hris") {
        await assertEmployeeSeat(tx, c.companyId);
        const [created] = await tx.insert(employeesTable).values({ companyId: c.companyId, ...inbound } as any).returning();
        localId = created.id;
      } else {
        const [created] = await tx.insert(candidateProfilesTable).values({
          companyId: c.companyId, name: inbound.name, email: inbound.email ?? null,
          roleApplyingFor: inbound.role, source: c.provider,
        }).returning();
        localId = created.id;
      }
      baseline = inbound;
    }
    const identity = { companyId: c.companyId, connectionId: c.id, provider: c.provider, kind: c.category,
      remoteId, localId, payloadHash: hashPayload(values), syncBaseline: baseline, updatedAt: new Date() };
    if (prior) await tx.update(imports).set(identity).where(eq(imports.id, prior.id));
    else await tx.insert(imports).values(identity);
    return localId;
  });
}

async function outboundPass(c: Connection, config: SyncConfig, approval: Date, issues: any[]) {
  if (!config.outbound) return;
  const outbound = config.outbound;
  // Revalidate stored approvals too: older schedules must not retain unsafe
  // create/append capability after the policy changes.
  assertAutomaticUpdate(c.provider, outbound);
  const action = await actionFor(c, outbound.actionKey, true);
  const identities = await db.select().from(imports).where(and(eq(imports.companyId, c.companyId),
    eq(imports.provider, c.provider), eq(imports.kind, c.category)));
  // The pass is bounded, but already-sent payloads do not consume its write budget.
  let sent = 0;
  for (const identity of identities) {
    if (sent >= 20) break;
    await db.transaction(async tx => {
      if (!await active(tx, c, approval)) return;
      const table = c.category === "hris" ? employeesTable : candidateProfilesTable;
      const [local] = await tx.select().from(table).where(and(eq(table.companyId, c.companyId), eq(table.id, identity.localId)));
      if (!local) return;
      const fields = localRecord(local, c.category);
      const props: Record<string, unknown> = { ...outbound.props };
      for (const [prop, field] of Object.entries(outbound.fields)) props[prop] = field === "remoteId" ? identity.remoteId : fields[field];
      const validated = validateActionProps(action, props);
      const payloadHash = hashPayload({ action: action.key, props: validated });
      const [blocked] = await tx.select().from(writes).where(and(eq(writes.companyId, c.companyId),
        eq(writes.provider, c.provider), eq(writes.remoteId, identity.remoteId),
        inArray(writes.status, ["dispatched", "needs_review"]))).limit(1);
      if (blocked) return;
      // Use a separate committed insert BEFORE network dispatch, not this tx.
      const [write] = await db.insert(writes).values({ companyId: c.companyId, provider: c.provider,
        remoteId: identity.remoteId, payloadHash, status: "dispatched" }).onConflictDoNothing().returning();
      if (!write) return;
      sent++;
      try {
        await verify(c);
        await sleep(1000);
        await execute(c, action, validated); // Writes are NEVER automatically retried.
        await db.update(writes).set({ status: "applied", message: "Provider acknowledged the write." }).where(eq(writes.id, write.id));
      } catch {
        await db.update(writes).set({ status: "needs_review", message: "Outcome uncertain. Check the provider and reconcile before further writes." }).where(eq(writes.id, write.id));
        issues.push({ remoteId: identity.remoteId, message: "Outbound outcome needs reconciliation." });
      }
    });
  }
}

export async function runSync(companyId: number, connectionId: number) {
  return db.transaction(async lock => {
    // Cross-process exclusion without locking the config row during safe reads.
    const result = await lock.execute(sql`select pg_try_advisory_xact_lock(73432, ${connectionId}) as acquired`);
    if (!result.rows[0]?.acquired) return;
    const c = await syncConnection(companyId, connectionId);
    const [sync] = await db.select().from(syncs).where(and(eq(syncs.companyId, companyId), eq(syncs.connectionId, connectionId)));
    if (!sync?.enabled || !sync.approvedAt) return;
    const config = sync.config as SyncConfig;
    const approval = sync.approvedAt;
    const fence = and(eq(syncs.id, sync.id), eq(syncs.enabled, true), eq(syncs.approvedAt, approval));
    let runId: number | undefined;
    const issues: { remoteId?: string; message: string }[] = [];
    let applied = 0;
    try {
      if (sync.approvedAccount !== c.brokerAccountId) throw new IntegrationError(409, "The account changed. Preview and approve sync again.");
      await verify(c);
      await db.update(runs).set({ status: "interrupted", message: "The previous worker stopped before recording completion. Safe reads can resume; external writes still require reconciliation." })
        .where(and(eq(runs.companyId, companyId), eq(runs.connectionId, connectionId), eq(runs.actionKey, "automatic-sync"), eq(runs.status, "running")));
      const [run] = await db.insert(runs).values({ companyId, connectionId, requestId: randomUUID(),
        actionKey: "automatic-sync", direction: "inbound", status: "running" }).returning();
      runId = run.id;
      const action = await actionFor(c, config.actionKey, false);
      let cursor = { ...sync.cursor };
      for (let page = 0; page < 5; page++) {
        const [live] = await db.select().from(syncs).where(fence);
        if (!live) return;
        // Every page rechecks revocation, account binding, environment and entitlement.
        await verify(await syncConnection(companyId, connectionId));
        const props = validateActionProps(action, pageProps(config, cursor.page, cursor.watermark));
        await sleep(1000); // At most one provider page per second, across this account's worker.
        const data = await safeRead(async () => {
          const [stillEnabled] = await db.select().from(syncs).where(fence);
          if (!stillEnabled) throw new IntegrationError(409, "Sync stopped or its approval changed.");
          await verify(await syncConnection(companyId, connectionId));
          return execute(c, action, props);
        });
        if (JSON.stringify(data).length > 1000000) throw new IntegrationError(413, "Reduce the provider page size before syncing.");
        const rows = extractExchangeRows(data, 251);
        const next = pageAfter(data, rows.length, config, props[config.pagination.prop!]);
        for (const raw of rows) {
          try {
            if (config.updatedAtPath) {
              const stamp = pathValue(raw, config.updatedAtPath);
              const time = typeof stamp === "string" ? Date.parse(stamp) : NaN;
              if (!Number.isFinite(time)) throw new IntegrationError(422, "The incremental timestamp mapping is invalid.");
              if (cursor.watermark && time < cursor.watermark) continue;
              cursor.highwater = Math.max(cursor.highwater ?? 0, Math.min(time, Date.now()));
            }
            await applyRecord(c, config, raw, approval);
            applied++;
          } catch (err) {
            if (issues.length < 100) issues.push({ remoteId: String(raw.id ?? raw.uuid ?? raw.employeeId ?? "").slice(0, 500), message: publicError(err) });
            cursor.cycleHasIssues = true;
          }
        }
        if (next == null) {
          cursor = { watermark: cursor.cycleHasIssues ? cursor.watermark : cursor.highwater ?? cursor.watermark };
          // JSONB must not contain undefined.
          cursor = JSON.parse(JSON.stringify(cursor));
        } else cursor.page = next;
        await db.update(syncs).set({ cursor }).where(fence);
        if (next == null) break;
      }
      await outboundPass(c, config, approval, issues);
      const status = issues.length ? "partial" : "succeeded";
      await db.update(runs).set({ status, result: { applied, issues }, message: issues.length ? "Some records need review." : "Sync completed." }).where(eq(runs.id, runId));
      const [live] = await db.select().from(syncs).where(fence);
      const hasMore = live?.cursor.page != null;
      await db.update(syncs).set({
        lastSyncAt: new Date(), nextSyncAt: new Date(Date.now() + (hasMore ? 60000 : config.intervalMinutes * 60000)),
        message: issues.length ? `${applied} records processed; ${issues.length} issues need review.` : hasMore ? "Page limit reached; continuing in one minute." : `${applied} records processed.`,
      }).where(fence);
    } catch (err) {
      const revoked = err instanceof IntegrationError && [401, 403, 404, 409].includes(err.status);
      if (runId) await db.update(runs).set({ status: "failed", message: publicError(err), result: { applied, issues } }).where(eq(runs.id, runId));
      await db.update(syncs).set({
        enabled: !revoked, lastSyncAt: new Date(), nextSyncAt: revoked ? null : new Date(Date.now() + config.intervalMinutes * 60000),
        message: publicError(err),
      }).where(fence);
    }
  });
}

let running = false;
export async function integrationSyncTick() {
  if (running) return;
  running = true;
  try {
    const due = await db.select().from(syncs).where(and(eq(syncs.enabled, true), sql`${syncs.nextSyncAt} <= now()`)).orderBy(syncs.nextSyncAt).limit(20);
    for (const row of due) {
      try { await runSync(row.companyId, row.connectionId); }
      catch { logger.warn({ connectionId: row.connectionId }, "Automatic integration sync could not run"); }
    }
  } finally { running = false; }
}
export function startIntegrationSyncScheduler() {
  const timer = setInterval(() => void integrationSyncTick().catch(() => logger.error("Automatic sync scheduler failed")), 30000);
  timer.unref();
  void integrationSyncTick().catch(() => logger.error("Automatic sync startup pass failed"));
}
