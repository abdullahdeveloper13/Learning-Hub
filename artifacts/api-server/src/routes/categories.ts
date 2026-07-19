import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, coursesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/categories", async (req, res) => {
  try {
    const cats = await db.select().from(categoriesTable);
    const courseCounts = await db.select({
      categoryId: coursesTable.categoryId,
      count: sql<number>`count(*)::int`
    }).from(coursesTable).groupBy(coursesTable.categoryId);
    const countMap = Object.fromEntries(courseCounts.map(c => [c.categoryId, c.count]));
    const result = cats.map(c => ({ ...c, courseCount: countMap[c.id] ?? 0 }));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/categories", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { name, description, iconUrl } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const [cat] = await db.insert(categoriesTable).values({ name, slug, description, iconUrl }).returning();
    res.status(201).json({ ...cat, courseCount: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/categories/:categoryId", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params["categoryId"]!);
    const { name, description, iconUrl } = req.body;
    const updates: Record<string, unknown> = {};
    if (name) { updates["name"] = name; updates["slug"] = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""); }
    if (description !== undefined) updates["description"] = description;
    if (iconUrl !== undefined) updates["iconUrl"] = iconUrl;
    const [cat] = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id)).returning();
    if (!cat) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...cat, courseCount: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/categories/:categoryId", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params["categoryId"]!);
    await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
