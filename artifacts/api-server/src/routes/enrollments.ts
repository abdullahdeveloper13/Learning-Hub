import { Router } from "express";
import { db } from "@workspace/db";
import { enrollmentsTable, coursesTable, notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { databaseErrorResponse } from "../lib/httpErrors";
import { supabaseRest } from "../lib/supabaseRest";
import { hasPaidAccess } from "./payments";

const router = Router();

function enrollmentFromRest(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    enrolledAt: new Date(row.enrolled_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
  };
}

function courseFromRest(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    shortDescription: row.short_description,
    instructorId: row.instructor_id,
    categoryId: row.category_id,
    level: row.level,
    isPublished: row.is_published,
    price: row.price,
    faqs: row.faqs ?? [],
  };
}

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
    if (databaseErrorResponse(err)) {
      const enrollments = await supabaseRest().selectMany("enrollments", { user_id: req.user!.id });
      const withCourse = await Promise.all(enrollments.map(async (row) => {
        const enrollment = enrollmentFromRest(row);
        const course = await supabaseRest().selectOne("courses", { id: enrollment.courseId });
        return { ...enrollment, course: courseFromRest(course), progressPercent: 0 };
      }));
      res.json(withCourse);
      return;
    }
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
    const [targetCourse] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
    if (!targetCourse) { res.status(404).json({ error: "Course not found" }); return; }
    if (targetCourse.price > 0 && !(await hasPaidAccess(req.user!.id, courseId))) {
      res.status(402).json({ error: "Payment required", checkoutRequired: true });
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
    if (databaseErrorResponse(err)) {
      const { courseId } = req.body;
      const existing = await supabaseRest().selectMany("enrollments", {
        user_id: req.user!.id,
        course_id: courseId,
      });
      const course = await supabaseRest().selectOne("courses", { id: courseId });
      const restCourse = courseFromRest(course);
      if (existing.length > 0) {
        res.status(201).json({ ...enrollmentFromRest(existing[0]), course: restCourse, progressPercent: 0 });
        return;
      }
      if (!restCourse) { res.status(404).json({ error: "Course not found" }); return; }
      if (restCourse.price > 0) {
        res.status(402).json({ error: "Payment required", checkoutRequired: true });
        return;
      }
      const inserted = await supabaseRest().insertOne("enrollments", {
        user_id: req.user!.id,
        course_id: courseId,
      });
      await supabaseRest().insertOne("notifications", {
        user_id: req.user!.id,
        type: "enrollment",
        title: `Enrolled in ${course?.title ?? "course"}`,
        body: "Start learning now!",
        link: `/learn/${courseId}`,
      }).catch(() => {});
      res.status(201).json({ ...enrollmentFromRest(inserted), course: restCourse, progressPercent: 0 });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/enrollments/:enrollmentId", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params["enrollmentId"]);
    await db.delete(enrollmentsTable).where(eq(enrollmentsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const id = Number(req.params["enrollmentId"]);
      await supabaseRest().deleteOne("enrollments", { id });
      res.status(204).send();
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
