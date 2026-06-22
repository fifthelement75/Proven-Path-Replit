import { Router } from "express";
import { db, integrationConnectionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

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

router.get("/integrations", requireAuth, async (req, res): Promise<void> => {
  try {
    const connections = await db
      .select()
      .from(integrationConnectionsTable)
      .where(eq(integrationConnectionsTable.companyId, req.auth!.companyId));
    res.json({ connections });
  } catch (err: any) {
    logger.error({ err }, "integrations/list error");
    res.status(500).json({ message: "Could not load integrations." });
  }
});

router.post("/integrations/connect", requireAuth, async (req, res): Promise<void> => {
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

  const label = accountLabel?.trim() ? accountLabel.trim().slice(0, 120) : null;

  try {
    const now = new Date();
    const [connection] = await db
      .insert(integrationConnectionsTable)
      .values({
        companyId: auth.companyId,
        category,
        provider,
        status: "connected",
        accountLabel: label,
        connectedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [integrationConnectionsTable.companyId, integrationConnectionsTable.category],
        set: {
          provider,
          status: "connected",
          accountLabel: label,
          connectedAt: now,
          updatedAt: now,
        },
      })
      .returning();

    logger.info({ companyId: auth.companyId, category, provider }, "Integration connected");
    res.json({ connection });
  } catch (err: any) {
    logger.error({ err }, "integrations/connect error");
    res.status(500).json({ message: "Could not connect integration." });
  }
});

router.post("/integrations/disconnect", requireAuth, async (req, res): Promise<void> => {
  const auth = req.auth!;
  if (auth.role !== "admin") {
    res.status(403).json({ message: "Only company admins can manage integrations." });
    return;
  }

  const { category } = req.body as { category?: string };
  if (!isCategory(category)) {
    res.status(400).json({ message: "Invalid integration category." });
    return;
  }

  try {
    await db
      .delete(integrationConnectionsTable)
      .where(
        and(
          eq(integrationConnectionsTable.companyId, auth.companyId),
          eq(integrationConnectionsTable.category, category),
        ),
      );
    logger.info({ companyId: auth.companyId, category }, "Integration disconnected");
    res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, "integrations/disconnect error");
    res.status(500).json({ message: "Could not disconnect integration." });
  }
});

export default router;
