import { Router } from "express";
import crypto from "crypto";
import { db, integrationConnectionsTable, syncKeysTable, employeesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { assertEmployeeSeat, requireTeamEntitlement } from "../lib/entitlements";
import { requireTeamPlan } from "../middlewares/requireActivePlan";
import { createAuthorization, listCompanyAccounts, verifyAccount, pdRequest, projectPath, connectEnvironment, IntegrationError } from "../lib/pipedreamConnect";
import { SaveCustomerCredentialBody } from "@workspace/api-zod";
import { CUSTOMER_PROVIDERS, isCustomerProvider, saveCustomerCredential, verifyCustomerAccount } from "../lib/customerCredentials";
import { integrationCredentialsTable } from "@workspace/db";
import { verifyFirefliesAccess } from "../lib/firefliesMeetings";

const router = Router();

const SYNC_KEY_PREFIX = "ppk_live_";

function generateSyncKey(): { key: string; keyHash: string; keyPrefix: string } {
  const secret = crypto.randomBytes(24).toString("hex");
  const key = `${SYNC_KEY_PREFIX}${secret}`;
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");
  const keyPrefix = key.slice(0, SYNC_KEY_PREFIX.length + 6);
  return { key, keyHash, keyPrefix };
}

function hashSyncKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

const CATEGORIES = ["hris", "ats", "meeting"] as const;
type Category = (typeof CATEGORIES)[number];

const PROVIDERS: Record<Category, string[]> = {
  hris: ["workday", "bamboohr", "adp", "rippling", "gusto"],
  ats: ["greenhouse", "lever", "ashby", "icims"],
  meeting: ["fireflies", "granola", "otter", "notion"],
};

function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}

router.get("/integrations", requireAuth, requireTeamPlan, async (req, res): Promise<void> => {
  try {
    const connections = await db
      .select()
      .from(integrationConnectionsTable)
      .where(eq(integrationConnectionsTable.companyId, req.auth!.companyId));
    res.set("Cache-Control", "no-store");
    const verified = await Promise.all(connections.map(async connection => {
      let status = "needs_authorization";
      if (connection.brokerAccountId && connection.brokerEnvironment === connectEnvironment()) {
        try {
          if (isCustomerProvider(connection.provider)) await verifyCustomerAccount(req.auth!.companyId, connection.provider, connection.brokerAccountId);
          else {
            await verifyAccount(req.auth!.companyId, connection.provider, connection.brokerAccountId);
            if (connection.provider === "fireflies") await verifyFirefliesAccess(req.auth!.companyId, connection.brokerAccountId);
          }
          status = "connected";
        } catch (err) {
          status = err instanceof IntegrationError && [403,404,409].includes(err.status)
            ? "needs_authorization" : "verification_unavailable";
        }
      }
      return { ...connection, status };
    }));
    res.json({ connections: verified });
  } catch (err: any) {
    logger.error({ err }, "integrations/list error");
    res.status(500).json({ message: "Could not load integrations." });
  }
});

router.post("/integrations/credentials", requireAuth, requireTeamPlan, async (req, res): Promise<void> => {
  res.set("Cache-Control", "no-store");
  if (req.auth!.role !== "admin") { res.status(403).json({ message: "Only company admins can authorize tools." }); return; }
  const parsed = SaveCustomerCredentialBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: "Provide supported customer API credentials and confirm company authorization." }); return; }
  try {
    const connection = await saveCustomerCredential(req.auth!.companyId, parsed.data.provider, parsed.data);
    res.json({ connection });
  } catch (err) {
    res.status(err instanceof IntegrationError ? err.status : 502)
      .json({ message: err instanceof IntegrationError ? err.message : "Could not verify and securely save this connection." });
  }
});

router.post("/integrations/authorize", requireAuth, requireTeamPlan, async (req, res): Promise<void> => {
  if (req.auth!.role !== "admin") { res.status(403).json({ message: "Only company admins can authorize tools." }); return; }
  const { category, provider } = req.body ?? {};
  if (!isCategory(category) || !PROVIDERS[category].includes(provider)) {
    res.status(400).json({ message: "Invalid integration provider." }); return;
  }
  try {
    res.set("Cache-Control", "no-store");
    if (isCustomerProvider(provider)) {
      res.status(409).json({ message: CUSTOMER_PROVIDERS[provider].requirements }); return;
    }
    res.json(await createAuthorization(req.auth!.companyId, provider));
  } catch (err) {
    res.status(err instanceof IntegrationError ? err.status : 502)
      .json({ message: err instanceof IntegrationError ? err.message : "Could not start provider authorization." });
  }
});

router.post("/integrations/connect", requireAuth, requireTeamPlan, async (req, res): Promise<void> => {
  const auth = req.auth!;
  if (auth.role !== "admin") {
    res.status(403).json({ message: "Only company admins can manage integrations." });
    return;
  }

  const { category, provider, accountLabel } = req.body as {
    category?: string;
    provider?: string;
    accountLabel?: string;
  };

  if (!isCategory(category)) {
    res.status(400).json({ message: "Invalid integration category." });
    return;
  }
  if (!provider || !PROVIDERS[category].includes(provider)) {
    res.status(400).json({ message: "Invalid provider for this category." });
    return;
  }

  if (accountLabel !== undefined && typeof accountLabel !== "string") {
    res.status(400).json({ message: "Account label must be text." });
    return;
  }
  const label = accountLabel?.trim() ? accountLabel.trim().slice(0, 120) : null;

  try {
    if (isCustomerProvider(provider)) {
      res.status(409).json({ message: "Use the customer API credential form to verify this provider." }); return;
    }
    const accounts = await listCompanyAccounts(auth.companyId, provider);
    const account = accounts.filter((a: any) => a.healthy && !a.dead)
      .sort((a: any, b: any) => String(b.updated_at).localeCompare(String(a.updated_at)))[0];
    if (!account) {
      res.status(409).json({ message: "No authorized account found. Complete provider authorization, then verify the connection." });
      return;
    }
    await verifyAccount(auth.companyId, provider, account.id);
    if (provider === "fireflies") await verifyFirefliesAccess(auth.companyId, account.id);
    const now = new Date();
    const [connection] = await db
      .insert(integrationConnectionsTable)
      .values({
        companyId: auth.companyId,
        category,
        provider,
        status: "connected",
        brokerAccountId: account.id,
        brokerEnvironment: connectEnvironment(),
        accountLabel: label,
        connectedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: category === "meeting"
          ? [integrationConnectionsTable.companyId, integrationConnectionsTable.category, integrationConnectionsTable.provider]
          : [integrationConnectionsTable.companyId, integrationConnectionsTable.category],
        targetWhere: category === "meeting" ? undefined : sql`${integrationConnectionsTable.category} <> 'meeting'`,
        set: {
          provider,
          status: "connected",
          brokerAccountId: account.id,
          brokerEnvironment: connectEnvironment(),
          accountLabel: label,
          connectedAt: now,
          updatedAt: now,
        },
      })
      .returning();

    // A single-provider ATS replacement must not retain a previous direct credential.
    await db.delete(integrationCredentialsTable).where(eq(integrationCredentialsTable.connectionId, connection.id));
    logger.info({ companyId: auth.companyId, category, provider }, "Integration connected");
    res.json({ connection });
  } catch (err: any) {
    logger.error({ companyId: auth.companyId, provider }, "integrations/connect error");
    res.status(err instanceof IntegrationError ? err.status : 500).json({ message: err instanceof IntegrationError ? err.message : "Could not connect integration." });
  }
});

router.post("/integrations/disconnect", requireAuth, requireTeamPlan, async (req, res): Promise<void> => {
  const auth = req.auth!;
  if (auth.role !== "admin") {
    res.status(403).json({ message: "Only company admins can manage integrations." });
    return;
  }

  const { category, provider } = req.body as { category?: string; provider?: string };
  if (!isCategory(category)) {
    res.status(400).json({ message: "Invalid integration category." });
    return;
  }
  if ((category === "meeting" || provider !== undefined) && (!provider || !PROVIDERS[category].includes(provider))) {
    res.status(400).json({ message: "Specify a valid provider to disconnect." });
    return;
  }

  try {
    const rows = await db.select().from(integrationConnectionsTable).where(and(
      eq(integrationConnectionsTable.companyId, auth.companyId),
      eq(integrationConnectionsTable.category, category),
      provider ? eq(integrationConnectionsTable.provider, provider) : undefined,
    ));
    for (const row of rows) {
      // Direct providers have no documented API-key revocation endpoint. Deleting
      // the connection cascades its encrypted credential; the admin revokes at vendor.
      if (isCustomerProvider(row.provider)) continue;
      if (!row.brokerAccountId) continue;
      if (row.brokerEnvironment !== connectEnvironment()) {
        res.status(409).json({ message: "This connection belongs to a different Connect environment. Switch environments before revoking it." });
        return;
      }
      try {
        // Check ownership even when an account is unhealthy. Revocation must still work.
        const account = await pdRequest(projectPath(`/accounts/${encodeURIComponent(row.brokerAccountId)}?include_credentials=false`));
        if (account.external_id !== `provenpath:company:${auth.companyId}` || account.app?.name_slug !== row.provider) {
          throw new IntegrationError(403, "Account ownership could not be verified.");
        }
        await pdRequest(projectPath(`/accounts/${encodeURIComponent(row.brokerAccountId)}`), "DELETE");
      } catch (err) {
        if (!(err instanceof IntegrationError && err.status === 404)) throw err;
      }
    }
    await db
      .delete(integrationConnectionsTable)
      .where(
        and(
          eq(integrationConnectionsTable.companyId, auth.companyId),
          eq(integrationConnectionsTable.category, category),
          provider ? eq(integrationConnectionsTable.provider, provider) : undefined,
        ),
      );
    logger.info({ companyId: auth.companyId, category }, "Integration disconnected");
    res.json({ success: true });
  } catch (err: any) {
    logger.error({ companyId: auth.companyId, provider }, "integrations/disconnect error");
    res.status(err instanceof IntegrationError ? err.status : 500).json({ message: err instanceof IntegrationError ? err.message : "Could not disconnect integration." });
  }
});

// ---------------------------------------------------------------------------
// Inbound sync API key management (admin, JWT-authenticated)
// ---------------------------------------------------------------------------

router.get("/integrations/sync-key", requireAuth, requireTeamPlan, async (req, res): Promise<void> => {
  const auth = req.auth!;
  if (auth.role !== "admin") {
    res.status(403).json({ message: "Only company admins can manage the sync key." });
    return;
  }
  try {
    const [existing] = await db
      .select({
        keyPrefix: syncKeysTable.keyPrefix,
        lastUsedAt: syncKeysTable.lastUsedAt,
        createdAt: syncKeysTable.createdAt,
      })
      .from(syncKeysTable)
      .where(eq(syncKeysTable.companyId, auth.companyId))
      .limit(1);
    res.json({ syncKey: existing ?? null });
  } catch (err: any) {
    logger.error({ err }, "integrations/sync-key get error");
    res.status(500).json({ message: "Could not load the sync key." });
  }
});

router.post("/integrations/sync-key", requireAuth, requireTeamPlan, async (req, res): Promise<void> => {
  const auth = req.auth!;
  if (auth.role !== "admin") {
    res.status(403).json({ message: "Only company admins can manage the sync key." });
    return;
  }
  try {
    const { key, keyHash, keyPrefix } = generateSyncKey();
    const now = new Date();
    await db
      .insert(syncKeysTable)
      .values({ companyId: auth.companyId, keyHash, keyPrefix, createdAt: now, updatedAt: now, lastUsedAt: null })
      .onConflictDoUpdate({
        target: [syncKeysTable.companyId],
        set: { keyHash, keyPrefix, updatedAt: now, lastUsedAt: null },
      });
    logger.info({ companyId: auth.companyId }, "Sync key generated/rotated");
    // The plaintext key is returned exactly once and never stored.
    res.json({ key, keyPrefix });
  } catch (err: any) {
    logger.error({ err }, "integrations/sync-key post error");
    res.status(500).json({ message: "Could not generate a sync key." });
  }
});

router.delete("/integrations/sync-key", requireAuth, requireTeamPlan, async (req, res): Promise<void> => {
  const auth = req.auth!;
  if (auth.role !== "admin") {
    res.status(403).json({ message: "Only company admins can manage the sync key." });
    return;
  }
  try {
    await db.delete(syncKeysTable).where(eq(syncKeysTable.companyId, auth.companyId));
    logger.info({ companyId: auth.companyId }, "Sync key revoked");
    res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, "integrations/sync-key delete error");
    res.status(500).json({ message: "Could not revoke the sync key." });
  }
});

// ---------------------------------------------------------------------------
// Inbound employee sync (authenticated by the company's sync key, not JWT).
// HRIS/ATS systems (or middleware like Merge/Finch) push employee records here.
// Records are upserted by email within the company.
// ---------------------------------------------------------------------------

interface ParsedSyncRecord {
  email: string;
  name?: string;
  role?: string;
  department?: string;
  level?: string;
  startDate?: string;
  managerEmail?: string;
}

function asTrimmedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseSyncEmployeesBody(
  body: unknown,
): { employees: ParsedSyncRecord[] } | { error: string } {
  if (!body || typeof body !== "object" || !Array.isArray((body as any).employees)) {
    return { error: "Body must include an 'employees' array." };
  }
  const list = (body as any).employees as unknown[];
  if (list.length === 0) return { error: "'employees' must not be empty." };
  if (list.length > 1000) return { error: "Too many records in one request (max 1000)." };

  const employees: ParsedSyncRecord[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") {
      return { error: "Each employee must be an object." };
    }
    const r = raw as Record<string, unknown>;
    const email = asTrimmedString(r.email);
    if (!email || !email.includes("@")) {
      return { error: "Each employee requires a valid 'email'." };
    }
    employees.push({
      email,
      name: asTrimmedString(r.name),
      role: asTrimmedString(r.role) ?? asTrimmedString(r.title),
      department: asTrimmedString(r.department),
      level: asTrimmedString(r.level),
      startDate: asTrimmedString(r.startDate),
      managerEmail: asTrimmedString(r.managerEmail),
    });
  }
  return { employees };
}

router.post("/integrations/sync/employees", async (req, res): Promise<void> => {
  // Authenticate via the company's sync key.
  const header = req.headers.authorization;
  const headerKey = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const altKey = typeof req.headers["x-sync-key"] === "string" ? (req.headers["x-sync-key"] as string) : undefined;
  const providedKey = headerKey ?? altKey;

  if (!providedKey) {
    res.status(401).json({ message: "Missing sync key. Provide it as 'Authorization: Bearer <key>' or 'X-Sync-Key'." });
    return;
  }

  const [keyRow] = await db
    .select({ companyId: syncKeysTable.companyId })
    .from(syncKeysTable)
    .where(eq(syncKeysTable.keyHash, hashSyncKey(providedKey)))
    .limit(1);

  if (!keyRow) {
    res.status(401).json({ message: "Invalid sync key." });
    return;
  }
  const companyId = keyRow.companyId;
  const team = await requireTeamEntitlement(db, companyId);
  if (team !== "ok") {
    res.status(403).json({ message: "Employee sync is available on the Team plan.", code: "team_plan_required" });
    return;
  }

  const parsed = parseSyncEmployeesBody(req.body);
  if ("error" in parsed) {
    res.status(400).json({ message: parsed.error });
    return;
  }

  try {
    await db.update(syncKeysTable).set({ lastUsedAt: new Date() }).where(eq(syncKeysTable.companyId, companyId));

    // Load existing employees in this company, indexed by lowercased email.
    const existing = await db
      .select({ id: employeesTable.id, email: employeesTable.email })
      .from(employeesTable)
      .where(eq(employeesTable.companyId, companyId));
    const byEmail = new Map<string, number>();
    for (const e of existing) byEmail.set(e.email.toLowerCase(), e.id);

    let created = 0;
    let updated = 0;
    const errors: { email: string; reason: string }[] = [];
    // Collect manager assignments to resolve after all upserts.
    const managerLinks: { email: string; managerEmail: string }[] = [];

    for (const rec of parsed.employees) {
      const email = rec.email.trim();
      const emailKey = email.toLowerCase();
      const title = rec.role;
      if (rec.managerEmail) managerLinks.push({ email, managerEmail: rec.managerEmail });

      const existingId = byEmail.get(emailKey);
      if (existingId != null) {
        const updateData: Record<string, unknown> = {};
        if (rec.name != null) updateData.name = rec.name;
        if (title != null) updateData.role = title;
        if (rec.department != null) updateData.department = rec.department;
        if (rec.level != null) updateData.level = rec.level;
        if (rec.startDate != null) updateData.startDate = rec.startDate;
        if (Object.keys(updateData).length > 0) {
          await db.update(employeesTable).set(updateData).where(eq(employeesTable.id, existingId));
        }
        updated++;
      } else {
        const missing: string[] = [];
        if (!rec.name) missing.push("name");
        if (!title) missing.push("role/title");
        if (!rec.department) missing.push("department");
        if (!rec.level) missing.push("level");
        if (!rec.startDate) missing.push("startDate");
        if (missing.length > 0) {
          errors.push({ email, reason: `New employee missing required field(s): ${missing.join(", ")}` });
          continue;
        }
        let inserted: { id: number };
        try {
          [inserted] = await db.transaction(async (tx) => {
            await assertEmployeeSeat(tx, companyId);
            return tx.insert(employeesTable).values({
              companyId, name: rec.name!, email, role: title!,
              department: rec.department!, level: rec.level!, startDate: rec.startDate!,
            }).returning({ id: employeesTable.id });
          });
        } catch (err) {
          const code = (err as { code?: string }).code;
          if (code === "professional_seat_limit" || code === "team_seat_limit" || code === "invalid_seat_quantity" || code === "active_plan_required") {
            errors.push({ email, reason: (err as Error).message });
            continue;
          }
          throw err;
        }
        byEmail.set(emailKey, inserted.id);
        created++;
      }
    }

    // Resolve manager relationships now that all employees exist.
    let managersLinked = 0;
    for (const link of managerLinks) {
      const empId = byEmail.get(link.email.toLowerCase());
      const mgrId = byEmail.get(link.managerEmail.toLowerCase());
      if (empId == null) continue;
      if (mgrId == null) {
        errors.push({ email: link.email, reason: `Manager '${link.managerEmail}' not found in this company` });
        continue;
      }
      if (mgrId === empId) {
        errors.push({ email: link.email, reason: "Employee cannot be their own manager" });
        continue;
      }
      await db.update(employeesTable).set({ managerId: mgrId }).where(eq(employeesTable.id, empId));
      managersLinked++;
    }

    logger.info({ companyId, created, updated, managersLinked, errorCount: errors.length }, "Inbound employee sync processed");
    res.json({ created, updated, managersLinked, skipped: errors.length, errors });
  } catch (err: any) {
    logger.error({ err }, "integrations/sync/employees error");
    res.status(500).json({ message: "Could not process the employee sync." });
  }
});

export default router;
