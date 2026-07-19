import { Router } from "express";
import { db } from "@workspace/db";
import { lessonsTable, quizzesTable, questionsTable, assignmentsTable, modulesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/modules/:moduleId/lessons", async (req, res) => {
  try {
    const moduleId = parseInt(req.params["moduleId"]!);
    const lessons = await db.select().from(lessonsTable).where(eq(lessonsTable.moduleId, moduleId)).orderBy(asc(lessonsTable.position));
    res.json(lessons.map(l => ({ ...l, isCompleted: false })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/modules/:moduleId/lessons", requireAuth, async (req, res) => {
  try {
    const moduleId = parseInt(req.params["moduleId"]!);
    const { title, type = "video", content, videoUrl, pdfUrl, resourceUrl, thumbnailUrl, duration, position = 0, isFree = false, isExam = false, downloadableFiles = [] } = req.body;
    const [lesson] = await db.insert(lessonsTable).values({
      moduleId, title, type, content, videoUrl, pdfUrl, resourceUrl, thumbnailUrl, duration, position, isFree, isExam, downloadableFiles
    }).returning();
    res.status(201).json({ ...lesson, isCompleted: false });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/lessons/:lessonId", async (req, res) => {
  try {
    const lessonId = parseInt(req.params["lessonId"]!);
    const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, lessonId)).limit(1);
    if (!lesson) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...lesson, isCompleted: false });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/lessons/:lessonId", requireAuth, async (req, res) => {
  try {
    const lessonId = parseInt(req.params["lessonId"]!);
    const allowed = ["title", "type", "content", "videoUrl", "pdfUrl", "resourceUrl", "thumbnailUrl", "duration", "position", "isFree", "isExam", "downloadableFiles"];
    const updates: Record<string, unknown> = {};
    for (const f of allowed) if (req.body[f] !== undefined) updates[f] = req.body[f];
    const [lesson] = await db.update(lessonsTable).set(updates).where(eq(lessonsTable.id, lessonId)).returning();
    if (!lesson) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...lesson, isCompleted: false });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/lessons/:lessonId", requireAuth, async (req, res) => {
  try {
    const lessonId = parseInt(req.params["lessonId"]!);
    await db.delete(lessonsTable).where(eq(lessonsTable.id, lessonId));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get quiz linked to a lesson
router.get("/lessons/:lessonId/quiz", async (req, res) => {
  try {
    const lessonId = parseInt(req.params["lessonId"]!);
    const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.lessonId, lessonId)).limit(1);
    if (!quiz) { res.status(404).json({ error: "Not found" }); return; }
    const questions = await db.select().from(questionsTable).where(eq(questionsTable.quizId, quiz.id)).orderBy(asc(questionsTable.position));
    res.json({ ...quiz, questions });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get assignment linked to a lesson
router.get("/lessons/:lessonId/assignment", async (req, res) => {
  try {
    const lessonId = parseInt(req.params["lessonId"]!);
    const [assignment] = await db.select().from(assignmentsTable).where(eq(assignmentsTable.lessonId, lessonId)).limit(1);
    if (!assignment) { res.status(404).json({ error: "Not found" }); return; }
    res.json(assignment);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get module info (used by lesson editor to find courseId)
router.get("/modules/:moduleId", requireAuth, async (req, res) => {
  try {
    const moduleId = parseInt(req.params["moduleId"]!);
    const [mod] = await db.select().from(modulesTable).where(eq(modulesTable.id, moduleId)).limit(1);
    if (!mod) { res.status(404).json({ error: "Not found" }); return; }
    res.json(mod);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
