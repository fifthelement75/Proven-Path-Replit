import { Router, type Response } from "express";
import { createHash } from "node:crypto";
import { and, eq, desc, sql } from "drizzle-orm";
import {
  db, integrationConnectionsTable, integrationRunsTable, integrationImportsTable,
  employeesTable, candidateProfilesTable, feedbackTable,
} from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { requireTeamPlan } from "../middlewares/requireActivePlan";
import { assertEmployeeSeat } from "../lib/entitlements";
import {
  connectEnvironment, verifyAccount, IntegrationError, pdRequest,
} from "../lib/pipedreamConnect";
import { getExchangeActions, validateActionProps, executeExchangeAction, extractExchangeRows, normalizeExchangeRow } from "../lib/integrationActions";
import { CUSTOMER_PROVIDERS, isCustomerProvider, customerCredentialsReady, verifyCustomerAccount, customerActions, executeCustomerRead } from "../lib/customerCredentials";
import { logger } from "../lib/logger";
import { RunIntegrationExchangeBody, ImportIntegrationRecordBody } from "@workspace/api-zod";

const router = Router();
router.use("/integrations/exchange", requireAdmin, requireTeamPlan, (_req, res, next) => {
  res.set("Cache-Control", "no-store"); next();
});

function fail(res: Response, err: unknown) {
  // Do not log credentials, action input, provider output, or employee/candidate PII.
  logger.warn({ errorType: err instanceof Error ? err.name : "unknown" }, "Integration exchange failed");
  res.status(err instanceof IntegrationError ? err.status : 502)
    .json({ message: err instanceof IntegrationError ? err.message : "The integration request could not be completed." });
}

async function connectionFor(companyId: number, id: unknown, verify = true) {
  if (!/^\d+$/.test(String(id))) throw new IntegrationError(400, "Invalid connection.");
  const [row] = await db.select().from(integrationConnectionsTable).where(and(
    eq(integrationConnectionsTable.id, Number(id)), eq(integrationConnectionsTable.companyId, companyId),
  ));
  if (!row) throw new IntegrationError(404, "Connection not found.");
  if (!row.brokerAccountId || row.brokerEnvironment !== connectEnvironment()) throw new IntegrationError(409, "Authorize this tool in the current Connect environment first.");
  if (verify) {
    if (isCustomerProvider(row.provider)) await verifyCustomerAccount(companyId, row.provider, row.brokerAccountId);
    else await verifyAccount(companyId, row.provider, row.brokerAccountId);
  }
  return row;
}

router.get("/integrations/exchange/catalog", async (_req, res) => {
  try {
    const providers = ["workday","bamboohr","adp","rippling","gusto","greenhouse","lever","ashby","icims","fireflies","granola","otter","notion"];
    const availability = await Promise.all(providers.map(async provider => {
      if (isCustomerProvider(provider)) return {
        provider, available: customerCredentialsReady(), authorizationMethod: "customer_credentials",
        requirements: customerCredentialsReady() ? CUSTOMER_PROVIDERS[provider].requirements : "Customer credential encryption is not configured.",
      };
      try {
        await pdRequest(`/apps/${provider}`);
        return { provider, available: true, authorizationMethod: "pipedream" };
      } catch (err) {
        return { provider, available: false, authorizationMethod: "pipedream",
          requirements: err instanceof IntegrationError ? err.message : "Provider authorization is temporarily unavailable." };
      }
    }));
    res.json({ environment: connectEnvironment(), providers: availability });
  } catch (err) { fail(res, err); }
});

router.get("/integrations/exchange/sources", async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const employees = await db.select({ id: employeesTable.id, name: employeesTable.name, email: employeesTable.email, role: employeesTable.role })
      .from(employeesTable).where(eq(employeesTable.companyId, companyId)).limit(500);
    const candidates = await db.select({ id: candidateProfilesTable.id, name: candidateProfilesTable.name,
      email: candidateProfilesTable.email, role: candidateProfilesTable.roleApplyingFor, notes: candidateProfilesTable.notes })
      .from(candidateProfilesTable).where(eq(candidateProfilesTable.companyId, companyId)).limit(500);
    const feedback = await db.select({
      id: feedbackTable.id, name: employeesTable.name, role: feedbackTable.meetingType,
      whatWentWell: feedbackTable.whatWentWell, areasToImprove: feedbackTable.areasToImprove,
      actionItems: feedbackTable.actionItems, nextSteps: feedbackTable.nextSteps,
    }).from(feedbackTable).innerJoin(employeesTable, eq(employeesTable.id, feedbackTable.employeeId))
      .where(eq(employeesTable.companyId, companyId)).orderBy(desc(feedbackTable.id)).limit(500);
    const meetings = feedback.map(row => ({
      id: row.id, name: `${row.name} · ${row.role}`, notes: [
        row.whatWentWell, row.areasToImprove, row.actionItems, row.nextSteps,
      ].filter(Boolean).join("\n\n"),
    }));
    res.json({ employees, candidates, meetings });
  } catch (err) { fail(res, err); }
});

router.get("/integrations/exchange/:id", async (req, res) => {
  try {
    const connection = await connectionFor(req.auth!.companyId, req.params.id);
    const actions = isCustomerProvider(connection.provider) ? customerActions[connection.provider] : await getExchangeActions(connection.provider);
    const runs = await db.select({
      id: integrationRunsTable.id, actionKey: integrationRunsTable.actionKey, direction: integrationRunsTable.direction,
      status: integrationRunsTable.status, message: integrationRunsTable.message, createdAt: integrationRunsTable.createdAt,
    }).from(integrationRunsTable).where(and(eq(integrationRunsTable.companyId, req.auth!.companyId),
      eq(integrationRunsTable.connectionId, connection.id))).orderBy(desc(integrationRunsTable.id)).limit(15);
    res.json({ actions, runs, environment: connectEnvironment() });
  } catch (err) { fail(res, err); }
});

router.post("/integrations/exchange/:id/run", async (req, res) => {
  let runId: number | undefined;
  try {
    const companyId = req.auth!.companyId;
    const connection = await connectionFor(companyId, req.params.id);
    const parsed = RunIntegrationExchangeBody.safeParse(req.body);
    if (!parsed.success) throw new IntegrationError(400, "Provide an operation key, valid request UUID, and action fields.");
    const { key, props, confirmWrite, requestId } = parsed.data;
    if (typeof requestId !== "string" || !/^[a-f0-9-]{36}$/i.test(requestId)) throw new IntegrationError(400, "A unique request ID is required.");
    const action = (isCustomerProvider(connection.provider) ? customerActions[connection.provider] : await getExchangeActions(connection.provider)).find(a => a.key === key);
    if (!action) throw new IntegrationError(400, "This operation is not enabled for the selected tool.");
    if (action.write && confirmWrite !== true) throw new IntegrationError(400, "Confirm the write to the external tool first.");
    const validatedProps = validateActionProps(action, props);
    const [created] = await db.insert(integrationRunsTable).values({
      companyId, connectionId: connection.id, requestId, actionKey: action.key,
      direction: action.write ? "outbound" : "inbound", status: "running",
    }).onConflictDoNothing().returning();
    if (!created) {
      const [existing] = await db.select().from(integrationRunsTable).where(and(
        eq(integrationRunsTable.companyId, companyId), eq(integrationRunsTable.requestId, requestId),
      ));
      if (existing.connectionId !== connection.id || existing.actionKey !== key) throw new IntegrationError(409, "This request ID was already used for a different operation.");
      res.status(existing.status === "running" ? 202 : 200).json({
        run: existing, rows: existing.direction === "inbound" && existing.status === "succeeded"
          ? extractExchangeRows(existing.result).map(normalizeExchangeRow) : [],
      }); return;
    }
    runId = created.id;
    const result = isCustomerProvider(connection.provider)
      ? await executeCustomerRead(companyId, connection.provider, connection.brokerAccountId!, action.key, validatedProps)
      : await executeExchangeAction(companyId, connection.brokerAccountId!, action, validatedProps);
    const serialized = JSON.stringify(result);
    if (serialized.length > 1000000) throw new IntegrationError(413, "The provider returned too much data. Request a smaller page.");
    const [run] = await db.update(integrationRunsTable).set({ status: "succeeded", result })
      .where(eq(integrationRunsTable.id, runId)).returning();
    res.json({ run, rows: action.write ? [] : extractExchangeRows(result).map(normalizeExchangeRow) });
  } catch (err) {
    if (runId) await db.update(integrationRunsTable).set({
      status: "needs_review", message: "Request failed or outcome is uncertain. Check the external tool before retrying a write.",
    }).where(eq(integrationRunsTable.id, runId));
    fail(res, err);
  }
});

router.get("/integrations/exchange/:id/runs/:runId", async (req, res) => {
  try {
    const connection = await connectionFor(req.auth!.companyId, req.params.id, false);
    if (!/^\d+$/.test(String(req.params.runId))) throw new IntegrationError(400, "Invalid exchange.");
    const [run] = await db.select().from(integrationRunsTable).where(and(
      eq(integrationRunsTable.id, Number(req.params.runId)), eq(integrationRunsTable.connectionId, connection.id),
      eq(integrationRunsTable.companyId, req.auth!.companyId),
    ));
    if (!run) throw new IntegrationError(404, "Exchange not found.");
    res.json({ run, rows: run.direction === "inbound" && run.status === "succeeded"
      ? extractExchangeRows(run.result).map(normalizeExchangeRow) : [] });
  } catch (err) { fail(res, err); }
});

router.post("/integrations/exchange/:id/import", async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const connection = await connectionFor(companyId, req.params.id, false);
    const parsed = ImportIntegrationRecordBody.safeParse(req.body);
    if (!parsed.success) throw new IntegrationError(400, "Provide a valid read result, record index, and import fields.");
    const { runId, index, employeeId, defaults = {} } = parsed.data;
    if (!Number.isSafeInteger(runId) || !Number.isSafeInteger(index) || index < 0 ||
        !defaults || typeof defaults !== "object" || Array.isArray(defaults)) throw new IntegrationError(400, "Invalid import request.");
    const [run] = await db.select().from(integrationRunsTable).where(and(
      eq(integrationRunsTable.id, runId), eq(integrationRunsTable.connectionId, connection.id),
      eq(integrationRunsTable.companyId, companyId),
    ));
    if (!run || run.direction !== "inbound" || run.status !== "succeeded") throw new IntegrationError(400, "Choose a successful read operation.");
    const raw = extractExchangeRows(run.result)[index];
    if (!raw) throw new IntegrationError(400, "Record not found in this read result.");
    const record = normalizeExchangeRow(raw);
    if (!record.remoteId) throw new IntegrationError(422, "This provider result has no stable record ID. Read the individual record before importing.");
    const kind = connection.category;
    const payloadHash = createHash("sha256").update(JSON.stringify({
      record, defaults: Object.fromEntries(Object.entries(defaults).sort(([a],[b]) => a.localeCompare(b))), employeeId,
    })).digest("hex");
    const result = await db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(${companyId}, ${connection.id})`);
      const [existing] = await tx.select().from(integrationImportsTable).where(and(
        eq(integrationImportsTable.companyId, companyId), eq(integrationImportsTable.provider, connection.provider),
        eq(integrationImportsTable.remoteId, record.remoteId!),
        eq(integrationImportsTable.kind, kind),
      ));
      if (existing?.payloadHash === payloadHash) return { localId: existing.localId, alreadyImported: true };
      const field = (name: string, fallback?: string) => {
        const v = defaults[name] ?? fallback;
        if (typeof v !== "string" || !v.trim() || v.length > 500) throw new IntegrationError(422, `Provide ${name} before importing.`);
        return v.trim();
      };
      let localId: number;
      if (kind === "hris") {
        const email = field("email", record.email).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new IntegrationError(422, "A valid employee email is required.");
        const name = field("name", record.name), role = field("role", record.role);
        const department = field("department", record.department), level = field("level", record.level);
        const startDate = field("startDate", record.startDate?.slice(0,10));
        if (!validDate(startDate)) throw new IntegrationError(422, "startDate must be a valid YYYY-MM-DD date.");
        const [employee] = await tx.select().from(employeesTable).where(and(
          eq(employeesTable.companyId, companyId), existing ? eq(employeesTable.id, existing.localId) : sql`lower(${employeesTable.email}) = ${email}`,
        ));
        if (employee) {
          if (employee.email.toLowerCase() !== email) throw new IntegrationError(409, "This employee’s email changed at the provider. Reconcile the employee email in Proven Path before importing.");
          await tx.update(employeesTable).set({ name, role, department, level, startDate }).where(eq(employeesTable.id, employee.id));
          localId = employee.id;
        } else {
          await assertEmployeeSeat(tx, companyId);
          const [created] = await tx.insert(employeesTable).values({ companyId, email, name, role, department, level, startDate }).returning({ id: employeesTable.id });
          localId = created.id;
        }
      } else if (kind === "ats") {
        const name = field("name", record.name), roleApplyingFor = field("role", record.role);
        const email = record.email?.toLowerCase();
        const [candidate] = email || existing ? await tx.select().from(candidateProfilesTable).where(and(
          eq(candidateProfilesTable.companyId, companyId), existing ? eq(candidateProfilesTable.id, existing.localId) : sql`lower(${candidateProfilesTable.email}) = ${email}`,
        )) : [];
        if (candidate) {
          await tx.update(candidateProfilesTable).set({ name, roleApplyingFor }).where(eq(candidateProfilesTable.id, candidate.id));
          localId = candidate.id;
        } else {
          const [created] = await tx.insert(candidateProfilesTable).values({
            companyId, name, email: email ?? null, roleApplyingFor, source: connection.provider,
          }).returning({ id: candidateProfilesTable.id });
          localId = created.id;
        }
      } else {
        if (typeof employeeId !== "number" || !Number.isSafeInteger(employeeId)) throw new IntegrationError(422, "Choose the employee who should receive this meeting note.");
        const [employee] = await tx.select({ id: employeesTable.id }).from(employeesTable).where(and(
          eq(employeesTable.id, employeeId), eq(employeesTable.companyId, companyId),
        ));
        if (!employee) throw new IntegrationError(404, "Employee not found in your company.");
        const summary = record.summary;
        if (!summary) throw new IntegrationError(422, "This result contains no meeting summary. Use Get Note or Find Meeting by ID first.");
        const meetingDate = field("meetingDate", record.date?.slice(0,10));
        if (!validDate(meetingDate)) throw new IntegrationError(422, "Provide the meeting’s actual date as YYYY-MM-DD.");
        const values = {
          employeeId, meetingType: "Imported meeting", meetingDate,
          nextSteps: `[Imported from ${connection.provider}] ${record.title ?? "Meeting"}\n\n${summary.slice(0,50000)}`,
          actionItems: record.actionItems?.slice(0,50000),
        };
        const [prior] = existing ? await tx.select().from(feedbackTable).where(eq(feedbackTable.id, existing.localId)) : [];
        if (prior) {
          if (prior.employeeId !== employeeId) throw new IntegrationError(409, "This source meeting is already linked to a different employee. Choose that employee to update its imported note.");
          await tx.update(feedbackTable).set(values).where(eq(feedbackTable.id, prior.id));
          localId = prior.id;
        } else {
          const [created] = await tx.insert(feedbackTable).values(values).returning({ id: feedbackTable.id });
          localId = created.id;
        }
      }
      if (existing) {
        await tx.update(integrationImportsTable).set({ localId, payloadHash, connectionId: connection.id, updatedAt: new Date() })
          .where(eq(integrationImportsTable.id, existing.id));
      } else {
        await tx.insert(integrationImportsTable).values({
          companyId, connectionId: connection.id, provider: connection.provider, remoteId: record.remoteId!, kind, localId, payloadHash,
        });
      }
      return { localId, alreadyImported: false };
    });
    res.json(result);
  } catch (err) { fail(res, err); }
});

export default router;

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0,10) === value;
}
