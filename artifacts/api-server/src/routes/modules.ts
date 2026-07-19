import { Router } from "express";
import { db } from "@workspace/db";
import { modulesTable, lessonsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/courses/:courseId/modules", async (req, res) => {
  try {
    const courseId = parseInt(req.params["courseId"]!);
    const modules = await db.select().from(modulesTable).where(eq(modulesTable.courseId, courseId)).orderBy(asc(modulesTable.position));
    const withLessons = await Promise.all(modules.map(async (m) => {
      const lessons = await db.select().from(lessonsTable).where(eq(lessonsTable.moduleId, m.id)).orderBy(asc(lessonsTable.position));
      return { ...m, lessons: lessons.map(l => ({ ...l, isCompleted: false })) };
    }));
    res.json(withLessons);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/courses/:courseId/modules", requireAuth, async (req, res) => {
  try {
    const courseId = parseInt(req.params["courseId"]!);
    const { title, description, position = 0 } = req.body;
    const [mod] = await db.insert(modulesTable).values({ courseId, title, description, position }).returning();
    res.status(201).json({ ...mod, lessons: [] });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/modules/:moduleId", requireAuth, async (req, res) => {
  try {
    const moduleId = parseInt(req.params["moduleId"]!);
    const { title, description, position } = req.body;
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates["title"] = title;
    if (description !== undefined) updates["description"] = description;
    if (position !== undefined) updates["position"] = position;
    const [mod] = await db.update(modulesTable).set(updates).where(eq(modulesTable.id, moduleId)).returning();
    if (!mod) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...mod, lessons: [] });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/modules/:moduleId", requireAuth, async (req, res) => {
  try {
    const moduleId = parseInt(req.params["moduleId"]!);
    await db.delete(modulesTable).where(eq(modulesTable.id, moduleId));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
