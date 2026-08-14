import { Router } from "express";
import { db } from "@workspace/db";
import { assignmentsTable, assignmentSubmissionsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { databaseErrorResponse } from "../lib/httpErrors";
import { supabaseRest } from "../lib/supabaseRest";

const router = Router();

function assignmentFromRest(row: any) {
  return {
    id: row.id,
    courseId: row.course_id,
    lessonId: row.lesson_id,
    title: row.title,
    description: row.description,
    instructions: row.instructions,
    rubric: row.rubric ?? [],
    dueDate: new Date(row.due_date),
    maxScore: row.max_score,
    submissionType: row.submission_type,
    allowedFileTypes: row.allowed_file_types ?? [],
    isFinalExam: row.is_final_exam,
    createdAt: new Date(row.created_at),
  };
}

function submissionFromRest(row: any) {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    userId: row.user_id,
    content: row.content,
    fileUrl: row.file_url,
    linkUrl: row.link_url,
    grade: row.grade,
    feedback: row.feedback,
    submittedAt: new Date(row.submitted_at),
    gradedAt: row.graded_at ? new Date(row.graded_at) : null,
  };
}

function assignmentToRestValues(values: any, courseId?: number) {
  const restValues: Record<string, unknown> = {};
  if (courseId !== undefined) restValues["course_id"] = courseId;
  const mappings: Record<string, string> = {
    lessonId: "lesson_id",
    dueDate: "due_date",
    maxScore: "max_score",
    submissionType: "submission_type",
    allowedFileTypes: "allowed_file_types",
    isFinalExam: "is_final_exam",
  };
  for (const [key, value] of Object.entries(values)) {
    restValues[mappings[key] ?? key] = key === "dueDate" ? new Date(value as string).toISOString() : value;
  }
  return restValues;
}

router.get("/courses/:courseId/assignments", async (req, res) => {
  try {
    const courseId = Number(req.params["courseId"]);
    const assignments = await db.select().from(assignmentsTable).where(eq(assignmentsTable.courseId, courseId));
    res.json(assignments);
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const courseId = Number(req.params["courseId"]);
      const rows = await supabaseRest().selectMany("assignments", { course_id: courseId });
      res.json(rows.map(assignmentFromRest));
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/courses/:courseId/assignments", requireAuth, async (req, res) => {
  try {
    const courseId = Number(req.params["courseId"]);
    const { title, description, instructions, dueDate, maxScore = 100, submissionType = "text", lessonId, allowedFileTypes = [], isFinalExam = false, rubric = [] } = req.body;
    const [assignment] = await db.insert(assignmentsTable).values({
      courseId, title, description, instructions,
      dueDate: new Date(dueDate || Date.now() + 30 * 24 * 3600000),
      maxScore, submissionType, lessonId, allowedFileTypes, isFinalExam, rubric,
    }).returning();
    res.status(201).json(assignment);
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const courseId = Number(req.params["courseId"]);
      const { title, description, instructions, dueDate, maxScore = 100, submissionType = "text", lessonId, allowedFileTypes = [], isFinalExam = false, rubric = [] } = req.body;
      const inserted = await supabaseRest().insertOne("assignments", assignmentToRestValues({
        title,
        description,
        instructions,
        dueDate: dueDate || new Date(Date.now() + 30 * 24 * 3600000).toISOString(),
        maxScore,
        submissionType,
        lessonId,
        allowedFileTypes,
        isFinalExam,
        rubric,
      }, courseId));
      res.status(201).json(assignmentFromRest(inserted));
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/assignments/:assignmentId", async (req, res) => {
  try {
    const id = Number(req.params["assignmentId"]);
    const [assignment] = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id)).limit(1);
    if (!assignment) { res.status(404).json({ error: "Not found" }); return; }
    res.json(assignment);
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const id = Number(req.params["assignmentId"]);
      const row = await supabaseRest().selectOne("assignments", { id });
      if (!row) { res.status(404).json({ error: "Not found" }); return; }
      res.json(assignmentFromRest(row));
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/assignments/:assignmentId", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params["assignmentId"]);
    const updates: Record<string, unknown> = {};
    for (const f of ["title", "description", "instructions", "dueDate", "maxScore", "submissionType", "rubric", "allowedFileTypes", "isFinalExam"]) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    if (updates.dueDate) updates.dueDate = new Date(updates.dueDate as string);
    const [assignment] = await db.update(assignmentsTable).set(updates).where(eq(assignmentsTable.id, id)).returning();
    if (!assignment) { res.status(404).json({ error: "Not found" }); return; }
    res.json(assignment);
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const id = Number(req.params["assignmentId"]);
      const updates: Record<string, unknown> = {};
      for (const f of ["title", "description", "instructions", "dueDate", "maxScore", "submissionType", "rubric", "allowedFileTypes", "isFinalExam"]) {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
      }
      const row = await supabaseRest().updateOne("assignments", { id }, assignmentToRestValues(updates));
      if (!row) { res.status(404).json({ error: "Not found" }); return; }
      res.json(assignmentFromRest(row));
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/assignments/:assignmentId", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params["assignmentId"]);
    await db.delete(assignmentsTable).where(eq(assignmentsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const id = Number(req.params["assignmentId"]);
      await supabaseRest().deleteOne("assignments", { id });
      res.status(204).send();
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/assignments/:assignmentId/submit", requireAuth, async (req, res) => {
  try {
    const assignmentId = Number(req.params["assignmentId"]);
    const { content = "Submitted", fileUrl, linkUrl } = req.body;
    const [sub] = await db.insert(assignmentSubmissionsTable).values({
      assignmentId, userId: req.user!.id, content, fileUrl, linkUrl,
    }).returning();
    res.status(201).json(sub);
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const assignmentId = Number(req.params["assignmentId"]);
      const { content = "Submitted", fileUrl, linkUrl } = req.body;
      const inserted = await supabaseRest().insertOne("assignment_submissions", {
        assignment_id: assignmentId,
        user_id: req.user!.id,
        content,
        file_url: fileUrl ?? null,
        link_url: linkUrl ?? null,
      });
      res.status(201).json(submissionFromRest(inserted));
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/assignments/:assignmentId/submissions", requireAuth, async (req, res) => {
  try {
    const assignmentId = Number(req.params["assignmentId"]);
    const subs = await db.select().from(assignmentSubmissionsTable).where(eq(assignmentSubmissionsTable.assignmentId, assignmentId));
    const enriched = await Promise.all(subs.map(async s => {
      const [user] = await db.select({ name: usersTable.name, email: usersTable.email, avatarUrl: usersTable.avatarUrl })
        .from(usersTable).where(eq(usersTable.id, s.userId)).limit(1);
      return { ...s, userName: user?.name, userEmail: user?.email, userAvatar: user?.avatarUrl };
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const assignmentId = Number(req.params["assignmentId"]);
      const rows = await supabaseRest().selectMany("assignment_submissions", { assignment_id: assignmentId });
      res.json(rows.map(submissionFromRest));
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/assignments/:assignmentId/submissions/:subId/grade", requireAuth, requireRole("instructor", "admin"), async (req, res) => {
  try {
    const subId = Number(req.params["subId"]);
    const { grade, feedback } = req.body;
    const [sub] = await db.update(assignmentSubmissionsTable)
      .set({ grade, feedback, gradedAt: new Date() })
      .where(eq(assignmentSubmissionsTable.id, subId))
      .returning();
    if (!sub) { res.status(404).json({ error: "Not found" }); return; }
    res.json(sub);
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const subId = Number(req.params["subId"]);
      const { grade, feedback } = req.body;
      const row = await supabaseRest().updateOne("assignment_submissions", { id: subId }, {
        grade,
        feedback,
        graded_at: new Date().toISOString(),
      });
      if (!row) { res.status(404).json({ error: "Not found" }); return; }
      res.json(submissionFromRest(row));
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
