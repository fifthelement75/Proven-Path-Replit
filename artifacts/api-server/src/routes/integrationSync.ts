import { Router } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { db, integrationSyncTable, integrationSyncWritesTable } from "@workspace/db";
import { ControlIntegrationSyncBody, GetIntegrationSyncResponse } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import { requireTeamEntitlement } from "../lib/entitlements";
import { IntegrationError } from "../lib/pipedreamConnect";
import { syncConnection, syncStatus, previewSync, approveSync, disableSync } from "../lib/integrationSync";
import type { SyncConfig } from "../lib/integrationSyncPolicy";

const router = Router();
// Status, disabling and reconciliation must remain available after a downgrade.
router.use("/integrations/sync", requireAdmin, (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.get("/integrations/sync/:id", async (req, res): Promise<void> => {
  try {
    if (!/^\d+$/.test(String(req.params.id))) throw new IntegrationError(400, "Invalid connection.");
    const c = await syncConnection(req.auth!.companyId, Number(req.params.id));
    res.json(GetIntegrationSyncResponse.parse(await syncStatus(c)));
  } catch (err) {
    res.status(err instanceof IntegrationError ? err.status : 500).json({ message: err instanceof IntegrationError ? err.message : "Could not load sync status." });
  }
});
router.post("/integrations/sync/:id", async (req, res): Promise<void> => {
  try {
    if (!/^\d+$/.test(String(req.params.id))) throw new IntegrationError(400, "Invalid connection.");
    const parsed = ControlIntegrationSyncBody.safeParse(req.body);
    if (!parsed.success) throw new IntegrationError(400, "Provide a valid sync command and mapping.");
    const c = await syncConnection(req.auth!.companyId, Number(req.params.id));
    const body = parsed.data;
    if (body.command === "preview") {
      if (!body.config) throw new IntegrationError(400, "Provide a mapping configuration.");
      res.json(GetIntegrationSyncResponse.parse(await previewSync(c, body.config as SyncConfig))); return;
    }
    if (body.command === "approve") {
      if (!body.previewId) throw new IntegrationError(400, "Preview the mapping first.");
      await approveSync(c, body.previewId, body.confirmOutbound === true);
    } else if (body.command === "disable") {
      await disableSync(c);
    } else if (body.command === "run") {
      if (await requireTeamEntitlement(db, c.companyId) !== "ok") throw new IntegrationError(403, "An active Team plan is required to run sync.");
      const updated = await db.update(integrationSyncTable).set({ nextSyncAt: new Date() })
        .where(and(eq(integrationSyncTable.companyId, c.companyId), eq(integrationSyncTable.connectionId, c.id), eq(integrationSyncTable.enabled, true))).returning();
      if (!updated.length) throw new IntegrationError(409, "Preview and approve sync before running it.");
    } else if (body.command === "reconcile") {
      if (!body.writeId || !body.resolution) throw new IntegrationError(400, "Choose a write and its verified provider outcome.");
      const updated = await db.transaction(async tx => {
        // A dispatched write may still be in flight. Wait for its dispatch
        // section before recording an admin's authoritative reconciliation.
        await tx.select().from(integrationSyncTable).where(and(
          eq(integrationSyncTable.companyId, c.companyId), eq(integrationSyncTable.connectionId, c.id))).for("update");
        return tx.update(integrationSyncWritesTable).set({
          status: body.resolution, message: "Provider outcome verified by a company admin. The same payload will not be automatically resent.",
        }).where(and(eq(integrationSyncWritesTable.id, body.writeId!), eq(integrationSyncWritesTable.companyId, c.companyId),
          eq(integrationSyncWritesTable.provider, c.provider), inArray(integrationSyncWritesTable.status, ["dispatched", "needs_review"]))).returning();
      });
      if (!updated.length) throw new IntegrationError(404, "Unresolved write not found.");
    }
    res.json(GetIntegrationSyncResponse.parse(await syncStatus(c)));
  } catch (err) {
    req.log.warn({ errorType: err instanceof Error ? err.name : "unknown" }, "Sync command failed");
    res.status(err instanceof IntegrationError ? err.status : 500).json({ message: err instanceof IntegrationError ? err.message : "Could not update automatic sync." });
  }
});
export default router;
