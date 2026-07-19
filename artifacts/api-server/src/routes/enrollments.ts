import { Router } from "express";
import { db } from "@workspace/db";
import { enrollmentsTable, coursesTable, notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/enrollments", requireAuth, async (req, res) => {
  try {
    const enrollments = await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.userId, req.user!.id));
    const withCourse = await Promise.all(enrollments.map(async e => {
      const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, e.courseId)).limit(1);
      return { ...e, course: course ?? null, progressPercent: 0 };
    }));
    res.json(withCourse);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/enrollments", requireAuth, async (req, res) => {
  try {
    const { courseId } = req.body;
    const existing = await db.select().from(enrollmentsTable)
      .where(and(eq(enrollmentsTable.userId, req.user!.id), eq(enrollmentsTable.courseId, courseId))).limit(1);
    if (existing.length > 0) {
      const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
      res.status(201).json({ ...existing[0], course: course ?? null, progressPercent: 0 });
      return;
    }
    const [enrollment] = await db.insert(enrollmentsTable).values({ userId: req.user!.id, courseId }).returning();
    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
    // Create notification
    await db.insert(notificationsTable).values({
      userId: req.user!.id, type: "enrollment",
      title: `Enrolled in ${course?.title ?? "course"}`,
      body: "Start learning now!",
      link: `/learn/${courseId}`,
    }).catch(() => {});
    res.status(201).json({ ...enrollment, course: course ?? null, progressPercent: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/enrollments/:enrollmentId", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params["enrollmentId"]!);
    await db.delete(enrollmentsTable).where(eq(enrollmentsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
