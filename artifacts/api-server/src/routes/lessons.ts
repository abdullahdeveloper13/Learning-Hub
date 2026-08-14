import { Router } from "express";
import { db } from "@workspace/db";
import { lessonsTable, quizzesTable, questionsTable, assignmentsTable, modulesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { databaseErrorResponse } from "../lib/httpErrors";
import { supabaseRest } from "../lib/supabaseRest";

const router = Router();

function hasSupabaseRestEnv() {
  return !!process.env["SUPABASE_URL"] && !!process.env["SUPABASE_SERVICE_ROLE_KEY"];
}

function lessonFromRest(row: any) {
  return {
    id: row.id,
    moduleId: row.module_id,
    title: row.title,
    type: row.type,
    content: row.content,
    videoUrl: row.video_url,
    pdfUrl: row.pdf_url,
    resourceUrl: row.resource_url,
    downloadableFiles: row.downloadable_files ?? [],
    thumbnailUrl: row.thumbnail_url,
    duration: row.duration,
    position: row.position,
    isFree: row.is_free,
    isExam: row.is_exam,
    createdAt: new Date(row.created_at),
    isCompleted: false,
  };
}

function lessonToRestValues(values: any, moduleId?: number) {
  const restValues: Record<string, unknown> = {};
  if (moduleId !== undefined) restValues["module_id"] = moduleId;

  const mappings: Record<string, string> = {
    videoUrl: "video_url",
    pdfUrl: "pdf_url",
    resourceUrl: "resource_url",
    thumbnailUrl: "thumbnail_url",
    isFree: "is_free",
    isExam: "is_exam",
    downloadableFiles: "downloadable_files",
  };

  for (const [key, value] of Object.entries(values)) {
    restValues[mappings[key] ?? key] = value;
  }
  return restValues;
}

router.get("/modules/:moduleId/lessons", async (req, res) => {
  try {
    const moduleId = Number(req.params["moduleId"]);
    if (hasSupabaseRestEnv()) {
      const rows = await supabaseRest().selectMany("lessons", { module_id: moduleId });
      res.json(rows.map(lessonFromRest).sort((a, b) => a.position - b.position));
      return;
    }
    const lessons = await db.select().from(lessonsTable).where(eq(lessonsTable.moduleId, moduleId)).orderBy(asc(lessonsTable.position));
    res.json(lessons.map(l => ({ ...l, isCompleted: false })));
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const moduleId = Number(req.params["moduleId"]);
      const rows = await supabaseRest().selectMany("lessons", { module_id: moduleId });
      res.json(rows.map(lessonFromRest).sort((a, b) => a.position - b.position));
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/modules/:moduleId/lessons", requireAuth, async (req, res) => {
  try {
    const moduleId = Number(req.params["moduleId"]);
    const { title, type = "video", content, videoUrl, pdfUrl, resourceUrl, thumbnailUrl, duration, position = 0, isFree = false, isExam = false, downloadableFiles = [] } = req.body;
    if (hasSupabaseRestEnv()) {
      const inserted = await supabaseRest().insertOne("lessons", lessonToRestValues({
        title, type, content, videoUrl, pdfUrl, resourceUrl, thumbnailUrl, duration, position, isFree, isExam, downloadableFiles,
      }, moduleId));
      res.status(201).json(lessonFromRest(inserted));
      return;
    }
    const [lesson] = await db.insert(lessonsTable).values({
      moduleId, title, type, content, videoUrl, pdfUrl, resourceUrl, thumbnailUrl, duration, position, isFree, isExam, downloadableFiles
    }).returning();
    res.status(201).json({ ...lesson, isCompleted: false });
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const moduleId = Number(req.params["moduleId"]);
      const { title, type = "video", content, videoUrl, pdfUrl, resourceUrl, thumbnailUrl, duration, position = 0, isFree = false, isExam = false, downloadableFiles = [] } = req.body;
      const inserted = await supabaseRest().insertOne("lessons", lessonToRestValues({
        title, type, content, videoUrl, pdfUrl, resourceUrl, thumbnailUrl, duration, position, isFree, isExam, downloadableFiles,
      }, moduleId));
      res.status(201).json(lessonFromRest(inserted));
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/lessons/:lessonId", async (req, res) => {
  try {
    const lessonId = Number(req.params["lessonId"]);
    if (hasSupabaseRestEnv()) {
      const row = await supabaseRest().selectOne("lessons", { id: lessonId });
      if (!row) { res.status(404).json({ error: "Not found" }); return; }
      res.json(lessonFromRest(row));
      return;
    }
    const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, lessonId)).limit(1);
    if (!lesson) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...lesson, isCompleted: false });
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const lessonId = Number(req.params["lessonId"]);
      const row = await supabaseRest().selectOne("lessons", { id: lessonId });
      if (!row) { res.status(404).json({ error: "Not found" }); return; }
      res.json(lessonFromRest(row));
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/lessons/:lessonId", requireAuth, async (req, res) => {
  try {
    const lessonId = Number(req.params["lessonId"]);
    const allowed = ["title", "type", "content", "videoUrl", "pdfUrl", "resourceUrl", "thumbnailUrl", "duration", "position", "isFree", "isExam", "downloadableFiles"];
    const updates: Record<string, unknown> = {};
    for (const f of allowed) if (req.body[f] !== undefined) updates[f] = req.body[f];
    if (hasSupabaseRestEnv()) {
      const row = await supabaseRest().updateOne("lessons", { id: lessonId }, lessonToRestValues(updates));
      if (!row) { res.status(404).json({ error: "Not found" }); return; }
      res.json(lessonFromRest(row));
      return;
    }
    const [lesson] = await db.update(lessonsTable).set(updates).where(eq(lessonsTable.id, lessonId)).returning();
    if (!lesson) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...lesson, isCompleted: false });
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const lessonId = Number(req.params["lessonId"]);
      const allowed = ["title", "type", "content", "videoUrl", "pdfUrl", "resourceUrl", "thumbnailUrl", "duration", "position", "isFree", "isExam", "downloadableFiles"];
      const updates: Record<string, unknown> = {};
      for (const f of allowed) if (req.body[f] !== undefined) updates[f] = req.body[f];
      const row = await supabaseRest().updateOne("lessons", { id: lessonId }, lessonToRestValues(updates));
      if (!row) { res.status(404).json({ error: "Not found" }); return; }
      res.json(lessonFromRest(row));
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/lessons/:lessonId", requireAuth, async (req, res) => {
  try {
    const lessonId = Number(req.params["lessonId"]);
    if (hasSupabaseRestEnv()) {
      await supabaseRest().deleteOne("lessons", { id: lessonId });
      res.status(204).send();
      return;
    }
    await db.delete(lessonsTable).where(eq(lessonsTable.id, lessonId));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const lessonId = Number(req.params["lessonId"]);
      await supabaseRest().deleteOne("lessons", { id: lessonId });
      res.status(204).send();
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get quiz linked to a lesson
router.get("/lessons/:lessonId/quiz", async (req, res) => {
  try {
    const lessonId = Number(req.params["lessonId"]);
    const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.lessonId, lessonId)).limit(1);
    if (!quiz) { res.status(404).json({ error: "Not found" }); return; }
    const questions = await db.select().from(questionsTable).where(eq(questionsTable.quizId, quiz.id)).orderBy(asc(questionsTable.position));
    res.json({ ...quiz, questions });
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const lessonId = Number(req.params["lessonId"]);
      const quiz = await supabaseRest().selectOne("quizzes", { lesson_id: lessonId });
      if (!quiz) { res.status(404).json({ error: "Not found" }); return; }
      const questions = await supabaseRest().selectMany("questions", { quiz_id: quiz.id });
      res.json({
        ...quiz,
        courseId: quiz.course_id,
        lessonId: quiz.lesson_id,
        timeLimit: quiz.time_limit,
        passingScore: quiz.passing_score,
        isFinalExam: quiz.is_final_exam,
        shuffleQuestions: quiz.shuffle_questions,
        maxAttempts: quiz.max_attempts,
        createdAt: new Date(quiz.created_at),
        questions: questions.sort((a, b) => a.position - b.position),
      });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get assignment linked to a lesson
router.get("/lessons/:lessonId/assignment", async (req, res) => {
  try {
    const lessonId = Number(req.params["lessonId"]);
    const [assignment] = await db.select().from(assignmentsTable).where(eq(assignmentsTable.lessonId, lessonId)).limit(1);
    if (!assignment) { res.status(404).json({ error: "Not found" }); return; }
    res.json(assignment);
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const lessonId = Number(req.params["lessonId"]);
      const assignment = await supabaseRest().selectOne("assignments", { lesson_id: lessonId });
      if (!assignment) { res.status(404).json({ error: "Not found" }); return; }
      res.json({
        ...assignment,
        courseId: assignment.course_id,
        lessonId: assignment.lesson_id,
        dueDate: new Date(assignment.due_date),
        maxScore: assignment.max_score,
        submissionType: assignment.submission_type,
        allowedFileTypes: assignment.allowed_file_types ?? [],
        isFinalExam: assignment.is_final_exam,
        createdAt: new Date(assignment.created_at),
      });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get module info (used by lesson editor to find courseId)
router.get("/modules/:moduleId", requireAuth, async (req, res) => {
  try {
    const moduleId = Number(req.params["moduleId"]);
    const [mod] = await db.select().from(modulesTable).where(eq(modulesTable.id, moduleId)).limit(1);
    if (!mod) { res.status(404).json({ error: "Not found" }); return; }
    res.json(mod);
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const moduleId = Number(req.params["moduleId"]);
      const mod = await supabaseRest().selectOne("modules", { id: moduleId });
      if (!mod) { res.status(404).json({ error: "Not found" }); return; }
      res.json({
        id: mod.id,
        courseId: mod.course_id,
        title: mod.title,
        description: mod.description,
        position: mod.position,
        createdAt: new Date(mod.created_at),
      });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
