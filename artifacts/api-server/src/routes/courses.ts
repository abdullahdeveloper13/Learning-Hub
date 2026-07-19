import { Router } from "express";
import { db } from "@workspace/db";
import {
  coursesTable, usersTable, categoriesTable, enrollmentsTable,
  reviewsTable, modulesTable, lessonsTable
} from "@workspace/db";
import { eq, ilike, and, sql, desc, asc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

function slugify(title: string) {
  return title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now();
}

async function enrichCourse(course: typeof coursesTable.$inferSelect) {
  const [instructor] = await db.select({ name: usersTable.name, avatarUrl: usersTable.avatarUrl })
    .from(usersTable).where(eq(usersTable.id, course.instructorId)).limit(1);
  const [category] = await db.select({ name: categoriesTable.name })
    .from(categoriesTable).where(eq(categoriesTable.id, course.categoryId)).limit(1);
  const [enrollCount] = await db.select({ count: sql<number>`count(*)::int` })
    .from(enrollmentsTable).where(eq(enrollmentsTable.courseId, course.id));
  const reviews = await db.select({ rating: reviewsTable.rating }).from(reviewsTable).where(eq(reviewsTable.courseId, course.id));
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  const modules = await db.select({ id: modulesTable.id }).from(modulesTable).where(eq(modulesTable.courseId, course.id));
  const moduleIds = modules.map(m => m.id);
  let totalLessons = 0;
  let totalDuration = 0;
  for (const mid of moduleIds) {
    const lessons = await db.select({ duration: lessonsTable.duration }).from(lessonsTable).where(eq(lessonsTable.moduleId, mid));
    totalLessons += lessons.length;
    totalDuration += lessons.reduce((s, l) => s + (l.duration || 0), 0);
  }
  return {
    ...course,
    instructorName: instructor?.name ?? null,
    instructorAvatar: instructor?.avatarUrl ?? null,
    categoryName: category?.name ?? null,
    enrollmentCount: enrollCount?.count ?? 0,
    reviewCount: reviews.length,
    rating: avgRating,
    totalLessons,
    totalDuration,
    updatedAt: course.updatedAt ?? course.createdAt,
  };
}

router.get("/courses", async (req, res) => {
  try {
    const { search, categoryId, level, instructorId, published, page = "1", limit = "12", sortBy = "newest" } = req.query as Record<string, string>;
    const conditions = [];
    if (search) conditions.push(ilike(coursesTable.title, `%${search}%`));
    if (categoryId) conditions.push(eq(coursesTable.categoryId, parseInt(categoryId)));
    if (level) conditions.push(eq(coursesTable.level, level as "beginner" | "intermediate" | "advanced"));
    if (instructorId) conditions.push(eq(coursesTable.instructorId, parseInt(instructorId)));
    if (published !== undefined) conditions.push(eq(coursesTable.isPublished, published === "true"));
    else conditions.push(eq(coursesTable.isPublished, true));

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = db.select().from(coursesTable);
    const courses = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(coursesTable.createdAt)).limit(limitNum).offset(offset)
      : await query.orderBy(desc(coursesTable.createdAt)).limit(limitNum).offset(offset);

    const enriched = await Promise.all(courses.map(enrichCourse));
    res.json({ courses: enriched, total: enriched.length, page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/courses", requireAuth, requireRole("instructor", "admin"), async (req, res) => {
  try {
    const { title, categoryId, level, price = 0, ...rest } = req.body;
    const slug = slugify(title);
    const [course] = await db.insert(coursesTable).values({
      title, slug, categoryId, level, price, instructorId: req.user!.id, ...rest
    }).returning();
    const enriched = await enrichCourse(course);
    res.status(201).json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/courses/:courseId", async (req, res) => {
  try {
    const courseId = parseInt(req.params["courseId"]!);
    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
    if (!course) { res.status(404).json({ error: "Not found" }); return; }
    const enriched = await enrichCourse(course);
    // Get modules with lessons
    const modules = await db.select().from(modulesTable).where(eq(modulesTable.courseId, courseId)).orderBy(asc(modulesTable.position));
    const modulesWithLessons = await Promise.all(modules.map(async (m) => {
      const lessons = await db.select().from(lessonsTable).where(eq(lessonsTable.moduleId, m.id)).orderBy(asc(lessonsTable.position));
      return { ...m, lessons: lessons.map(l => ({ ...l, isCompleted: false })) };
    }));
    res.json({ ...enriched, modules: modulesWithLessons });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/courses/:courseId", requireAuth, async (req, res) => {
  try {
    const courseId = parseInt(req.params["courseId"]!);
    const [existing] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (existing.instructorId !== req.user!.id && req.user!.role !== "admin") {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    const { title, ...rest } = req.body;
    const updates: Record<string, unknown> = { ...rest, updatedAt: new Date() };
    if (title) { updates["title"] = title; updates["slug"] = slugify(title); }
    const [updated] = await db.update(coursesTable).set(updates).where(eq(coursesTable.id, courseId)).returning();
    const enriched = await enrichCourse(updated);
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/courses/:courseId", requireAuth, async (req, res) => {
  try {
    const courseId = parseInt(req.params["courseId"]!);
    const [existing] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (existing.instructorId !== req.user!.id && req.user!.role !== "admin") {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    await db.delete(coursesTable).where(eq(coursesTable.id, courseId));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/courses/:courseId/publish", requireAuth, async (req, res) => {
  try {
    const courseId = parseInt(req.params["courseId"]!);
    const { isPublished } = req.body;
    const [updated] = await db.update(coursesTable).set({ isPublished, updatedAt: new Date() })
      .where(eq(coursesTable.id, courseId)).returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    const enriched = await enrichCourse(updated);
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/courses/:courseId/stats", requireAuth, async (req, res) => {
  try {
    const courseId = parseInt(req.params["courseId"]!);
    const [enrollCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(enrollmentsTable).where(eq(enrollmentsTable.courseId, courseId));
    const [completedCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(enrollmentsTable).where(and(eq(enrollmentsTable.courseId, courseId), sql`completed_at is not null`));
    const reviews = await db.select({ rating: reviewsTable.rating }).from(reviewsTable).where(eq(reviewsTable.courseId, courseId));
    const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    const total = enrollCount?.count ?? 0;
    const completed = completedCount?.count ?? 0;
    res.json({
      courseId,
      totalEnrollments: total,
      activeStudents: total - completed,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      averageRating: avgRating,
      totalRevenue: total * 49.99,
      enrollmentsByDay: [],
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/courses/:courseId/enrollments", requireAuth, async (req, res) => {
  try {
    const courseId = parseInt(req.params["courseId"]!);
    const enrollments = await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.courseId, courseId));
    res.json(enrollments.map(e => ({ ...e, course: null, progressPercent: 0 })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
