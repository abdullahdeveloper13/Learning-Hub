import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { databaseErrorResponse } from "../lib/httpErrors";

const router = Router();

router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const notifs = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.userId, req.user!.id))
      .orderBy(sql`created_at desc`).limit(50);
    res.json(notifs);
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      res.json([]);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/notifications/mark-read", requireAuth, async (req, res) => {
  try {
    const { notificationIds } = req.body as { notificationIds: number[] };
    if (!notificationIds?.length) { res.json({ updated: 0 }); return; }
    await db.update(notificationsTable).set({ isRead: true }).where(inArray(notificationsTable.id, notificationIds));
    res.json({ updated: notificationIds.length });
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      res.json({ updated: 0, databaseStatus: "unavailable" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/notifications/mark-all-read", requireAuth, async (req, res) => {
  try {
    await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, req.user!.id));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      res.json({ success: true, databaseStatus: "unavailable" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/notifications/unread-count", requireAuth, async (req, res) => {
  try {
    const [result] = await db.select({ count: sql<number>`count(*)::int` })
      .from(notificationsTable).where(and(eq(notificationsTable.userId, req.user!.id), eq(notificationsTable.isRead, false)));
    res.json({ count: result?.count ?? 0 });
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      res.json({ count: 0, databaseStatus: "unavailable" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
