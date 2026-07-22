import { Router } from "express";
import { db } from "@workspace/db";
import { modulesTable, lessonsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { databaseErrorResponse } from "../lib/httpErrors";
import { getAllFallbackCourses, getFallbackCourse, setFallbackCourse } from "./courses";
import { supabaseRest } from "../lib/supabaseRest";

const router = Router();
let fallbackModuleId = 20_000;

function getFallbackModules(courseId: number) {
  const course = getFallbackCourse(courseId);
  return Array.isArray(course?.modules) ? course.modules : [];
}

function setFallbackModules(courseId: number, modules: any[]) {
  const course = getFallbackCourse(courseId);
  if (!course) return false;
  const totalLessons = modules.reduce((count, mod) => count + (Array.isArray(mod.lessons) ? mod.lessons.length : 0), 0);
  setFallbackCourse(courseId, {
    ...course,
    modules,
    totalLessons,
    updatedAt: new Date().toISOString(),
  });
  return true;
}

function moduleFromRest(row: any) {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description,
    position: row.position,
    createdAt: new Date(row.created_at),
    lessons: [],
  };
}

function updateFallbackModule(moduleId: number, updates: Record<string, unknown>) {
  for (const course of getAllFallbackCourses()) {
    const modules = Array.isArray(course.modules) ? course.modules : [];
    const moduleIndex = modules.findIndex((mod: any) => mod.id === moduleId);
    if (moduleIndex === -1) continue;

    const updated = { ...modules[moduleIndex], ...updates };
    const nextModules = [...modules];
    nextModules[moduleIndex] = updated;
    setFallbackModules(course.id, nextModules);
    return updated;
  }
  return null;
}

function deleteFallbackModule(moduleId: number) {
  for (const course of getAllFallbackCourses()) {
    const modules = Array.isArray(course.modules) ? course.modules : [];
    if (!modules.some((mod: any) => mod.id === moduleId)) continue;
    setFallbackModules(course.id, modules.filter((mod: any) => mod.id !== moduleId));
    return true;
  }
  return false;
}

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
    if (databaseErrorResponse(err)) {
      const courseId = parseInt(req.params["courseId"]!);
      const restModules = (await supabaseRest().selectMany("modules", { course_id: courseId }))
        .map(moduleFromRest)
        .sort((a, b) => a.position - b.position);
      if (restModules.length) setFallbackModules(courseId, restModules);
      res.json(restModules.length ? restModules : getFallbackModules(courseId));
      return;
    }
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
    if (databaseErrorResponse(err)) {
      const courseId = parseInt(req.params["courseId"]!);
      const { title, description, position } = req.body;
      const modules = getFallbackModules(courseId);
      const inserted = await supabaseRest().insertOne("modules", {
        course_id: courseId,
        title,
        description: description ?? null,
        position: position ?? modules.length,
      });
      const mod = moduleFromRest(inserted);
      if (!setFallbackModules(courseId, [...modules, mod])) {
        res.status(404).json({ error: "Course not found" });
        return;
      }
      res.status(201).json(mod);
      return;
    }
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
    if (databaseErrorResponse(err)) {
      const moduleId = parseInt(req.params["moduleId"]!);
      const { title, description, position } = req.body;
      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates["title"] = title;
      if (description !== undefined) updates["description"] = description;
      if (position !== undefined) updates["position"] = position;
      const updated = updateFallbackModule(moduleId, updates);
      if (!updated) { res.status(404).json({ error: "Not found" }); return; }
      res.json(updated);
      return;
    }
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
    if (databaseErrorResponse(err)) {
      const moduleId = parseInt(req.params["moduleId"]!);
      if (!deleteFallbackModule(moduleId)) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.status(204).send();
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
