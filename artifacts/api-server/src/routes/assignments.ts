import { Router } from "express";
import { db } from "@workspace/db";
import { assignmentsTable, assignmentSubmissionsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/courses/:courseId/assignments", async (req, res) => {
  try {
    const courseId = parseInt(req.params["courseId"]!);
    const assignments = await db.select().from(assignmentsTable).where(eq(assignmentsTable.courseId, courseId));
    res.json(assignments);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/courses/:courseId/assignments", requireAuth, async (req, res) => {
  try {
    const courseId = parseInt(req.params["courseId"]!);
    const { title, description, instructions, dueDate, maxScore = 100, submissionType = "text", lessonId, allowedFileTypes = [], isFinalExam = false, rubric = [] } = req.body;
    const [assignment] = await db.insert(assignmentsTable).values({
      courseId, title, description, instructions,
      dueDate: new Date(dueDate || Date.now() + 30 * 24 * 3600000),
      maxScore, submissionType, lessonId, allowedFileTypes, isFinalExam, rubric,
    }).returning();
    res.status(201).json(assignment);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/assignments/:assignmentId", async (req, res) => {
  try {
    const id = parseInt(req.params["assignmentId"]!);
    const [assignment] = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id)).limit(1);
    if (!assignment) { res.status(404).json({ error: "Not found" }); return; }
    res.json(assignment);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/assignments/:assignmentId", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params["assignmentId"]!);
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
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/assignments/:assignmentId", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params["assignmentId"]!);
    await db.delete(assignmentsTable).where(eq(assignmentsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/assignments/:assignmentId/submit", requireAuth, async (req, res) => {
  try {
    const assignmentId = parseInt(req.params["assignmentId"]!);
    const { content = "Submitted", fileUrl, linkUrl } = req.body;
    const [sub] = await db.insert(assignmentSubmissionsTable).values({
      assignmentId, userId: req.user!.id, content, fileUrl, linkUrl,
    }).returning();
    res.status(201).json(sub);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/assignments/:assignmentId/submissions", requireAuth, async (req, res) => {
  try {
    const assignmentId = parseInt(req.params["assignmentId"]!);
    const subs = await db.select().from(assignmentSubmissionsTable).where(eq(assignmentSubmissionsTable.assignmentId, assignmentId));
    const enriched = await Promise.all(subs.map(async s => {
      const [user] = await db.select({ name: usersTable.name, email: usersTable.email, avatarUrl: usersTable.avatarUrl })
        .from(usersTable).where(eq(usersTable.id, s.userId)).limit(1);
      return { ...s, userName: user?.name, userEmail: user?.email, userAvatar: user?.avatarUrl };
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/assignments/:assignmentId/submissions/:subId/grade", requireAuth, requireRole("instructor", "admin"), async (req, res) => {
  try {
    const subId = parseInt(req.params["subId"]!);
    const { grade, feedback } = req.body;
    const [sub] = await db.update(assignmentSubmissionsTable)
      .set({ grade, feedback, gradedAt: new Date() })
      .where(eq(assignmentSubmissionsTable.id, subId))
      .returning();
    if (!sub) { res.status(404).json({ error: "Not found" }); return; }
    res.json(sub);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
