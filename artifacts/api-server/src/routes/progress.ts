import { Router } from "express";
import { db } from "@workspace/db";
import { lessonProgressTable, enrollmentsTable, modulesTable, lessonsTable, certificatesTable, notificationsTable, coursesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { randomUUID } from "crypto";

const router = Router();

async function getCourseProgress(userId: number, courseId: number) {
  const modules = await db.select().from(modulesTable).where(eq(modulesTable.courseId, courseId));
  let totalLessons = 0;
  let completedLessons = 0;
  let lastLessonId: number | null = null;
  for (const m of modules) {
    const lessons = await db.select().from(lessonsTable).where(eq(lessonsTable.moduleId, m.id));
    totalLessons += lessons.length;
    for (const l of lessons) {
      const [prog] = await db.select().from(lessonProgressTable)
        .where(and(eq(lessonProgressTable.userId, userId), eq(lessonProgressTable.lessonId, l.id))).limit(1);
      if (prog) { completedLessons++; lastLessonId = l.id; }
    }
  }
  const progressPercent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
  return { courseId, userId, progressPercent, completedLessons, totalLessons, lastLessonId, completedAt: null as string | null };
}

router.get("/progress", requireAuth, async (req, res) => {
  try {
    const enrollments = await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.userId, req.user!.id));
    const progress = await Promise.all(enrollments.map(e => getCourseProgress(req.user!.id, e.courseId)));
    res.json(progress);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/progress/:courseId", requireAuth, async (req, res) => {
  try {
    const courseId = parseInt(req.params["courseId"]!);
    const progress = await getCourseProgress(req.user!.id, courseId);
    res.json(progress);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/progress/lessons/:lessonId/complete", requireAuth, async (req, res) => {
  try {
    const lessonId = parseInt(req.params["lessonId"]!);
    const existing = await db.select().from(lessonProgressTable)
      .where(and(eq(lessonProgressTable.userId, req.user!.id), eq(lessonProgressTable.lessonId, lessonId))).limit(1);
    if (existing.length === 0) {
      await db.insert(lessonProgressTable).values({ userId: req.user!.id, lessonId });
    }
    const [prog] = await db.select().from(lessonProgressTable)
      .where(and(eq(lessonProgressTable.userId, req.user!.id), eq(lessonProgressTable.lessonId, lessonId))).limit(1);

    // Check if course is complete
    const [lesson] = await db.select({ moduleId: lessonsTable.moduleId }).from(lessonsTable).where(eq(lessonsTable.id, lessonId)).limit(1);
    if (lesson) {
      const [mod] = await db.select({ courseId: modulesTable.courseId }).from(modulesTable).where(eq(modulesTable.id, lesson.moduleId)).limit(1);
      if (mod) {
        const { progressPercent } = await getCourseProgress(req.user!.id, mod.courseId);
        if (progressPercent >= 100) {
          // Issue certificate
          const existing = await db.select().from(certificatesTable)
            .where(and(eq(certificatesTable.userId, req.user!.id), eq(certificatesTable.courseId, mod.courseId))).limit(1);
          if (existing.length === 0) {
            await db.insert(certificatesTable).values({ userId: req.user!.id, courseId: mod.courseId, credentialId: randomUUID() }).catch(() => {});
            const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, mod.courseId)).limit(1);
            await db.insert(notificationsTable).values({
              userId: req.user!.id, type: "completion",
              title: `Congratulations! You completed ${course?.title ?? "the course"}`,
              body: "Your certificate is ready.",
              link: "/certificates",
            }).catch(() => {});
          }
        }
      }
    }

    res.json({ lessonId, userId: req.user!.id, completedAt: prog!.completedAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
