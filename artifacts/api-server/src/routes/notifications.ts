import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const { userId, companyId } = req.auth!;
  const rows = await db.select().from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.companyId, companyId)))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);
  res.json(rows.map(n => ({ ...n, createdAt: n.createdAt.toISOString() })));
});

router.patch("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const { userId, companyId } = req.auth!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [updated] = await db.update(notificationsTable)
    .set({ read: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId), eq(notificationsTable.companyId, companyId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

router.post("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  const { userId, companyId } = req.auth!;
  await db.update(notificationsTable)
    .set({ read: true })
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.companyId, companyId)));
  res.json({ success: true });
});

export default router;
