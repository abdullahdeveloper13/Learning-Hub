import { Router } from "express";
import { db } from "@workspace/db";
import {
  coursesTable, usersTable, categoriesTable, enrollmentsTable,
  reviewsTable, modulesTable, lessonsTable
} from "@workspace/db";
import { eq, ilike, and, sql, desc, asc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { databaseErrorResponse } from "../lib/httpErrors";
import { supabaseRest } from "../lib/supabaseRest";

const router = Router();
const fallbackCourses = new Map<number, any>();

export function getFallbackCourse(courseId: number) {
  return fallbackCourses.get(courseId);
}

export function setFallbackCourse(courseId: number, course: any) {
  fallbackCourses.set(courseId, course);
}

export function getAllFallbackCourses() {
  return Array.from(fallbackCourses.values());
}

function slugify(title: string) {
  return title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now();
}

function courseFromRest(row: any) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    shortDescription: row.short_description,
    thumbnailUrl: row.thumbnail_url,
    bannerUrl: row.banner_url,
    previewVideoUrl: row.preview_video_url,
    instructorId: row.instructor_id,
    categoryId: row.category_id,
    level: row.level,
    isPublished: row.is_published,
    price: row.price,
    discountPrice: row.discount_price,
    tags: row.tags ?? [],
    requirements: row.requirements ?? [],
    outcomes: row.outcomes ?? [],
    prerequisites: row.prerequisites ?? [],
    faqs: row.faqs ?? [],
    hasCertificate: row.has_certificate,
    certificateTemplate: row.certificate_template,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    modules: [],
    enrollmentCount: 0,
    reviewCount: 0,
    rating: null,
    totalLessons: 0,
    totalDuration: 0,
    instructorName: "Instructor",
    categoryName: null,
  };
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

function courseToRestValues(values: any, instructorId: number, slug: string) {
  return {
    title: values.title,
    slug,
    description: values.description ?? null,
    short_description: values.shortDescription ?? null,
    thumbnail_url: values.thumbnailUrl ?? null,
    banner_url: values.bannerUrl ?? null,
    preview_video_url: values.previewVideoUrl ?? null,
    instructor_id: instructorId,
    category_id: values.categoryId,
    level: values.level ?? "beginner",
    is_published: values.isPublished ?? false,
    price: values.price ?? 0,
    discount_price: values.discountPrice ?? null,
    tags: values.tags ?? [],
    requirements: values.requirements ?? [],
    outcomes: values.outcomes ?? [],
    prerequisites: values.prerequisites ?? [],
    faqs: values.faqs ?? [],
    has_certificate: values.hasCertificate ?? true,
    certificate_template: values.certificateTemplate ?? null,
  };
}

function coursePatchToRestValues(values: any) {
  const restValues: Record<string, unknown> = {};
  const mappings: Record<string, string> = {
    shortDescription: "short_description",
    thumbnailUrl: "thumbnail_url",
    bannerUrl: "banner_url",
    previewVideoUrl: "preview_video_url",
    categoryId: "category_id",
    isPublished: "is_published",
    discountPrice: "discount_price",
    hasCertificate: "has_certificate",
    certificateTemplate: "certificate_template",
  };

  for (const [key, value] of Object.entries(values)) {
    restValues[mappings[key] ?? key] = value;
  }
  restValues["updated_at"] = new Date().toISOString();
  return restValues;
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

    const query = db.select().from(coursesTable);
    const courses = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(coursesTable.createdAt)).limit(limitNum).offset(offset)
      : await query.orderBy(desc(coursesTable.createdAt)).limit(limitNum).offset(offset);

    const enriched = await Promise.all(courses.map(enrichCourse));
    res.json({ courses: enriched, total: enriched.length, page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const restRows = await supabaseRest().selectMany("courses");
      const restCourses = restRows.map(courseFromRest);
      for (const course of restCourses) fallbackCourses.set(course.id, { ...fallbackCourses.get(course.id), ...course });
      const courses = restCourses.length ? restCourses : Array.from(fallbackCourses.values());
      const published = req.query["published"];
      const visible = published === "true" ? courses.filter((course) => course.isPublished) : courses;
      res.json({ courses: visible, total: visible.length, page: 1, limit: visible.length || 12 });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/courses/slug/:slug", async (req, res) => {
  try {
    const slug = String(req.params["slug"] ?? "");
    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.slug, slug)).limit(1);
    if (!course) { res.status(404).json({ error: "Not found" }); return; }
    const enriched = await enrichCourse(course);
    const modules = await db.select().from(modulesTable).where(eq(modulesTable.courseId, course.id)).orderBy(asc(modulesTable.position));
    const modulesWithLessons = await Promise.all(modules.map(async (m) => {
      const lessons = await db.select().from(lessonsTable).where(eq(lessonsTable.moduleId, m.id)).orderBy(asc(lessonsTable.position));
      return { ...m, lessons: lessons.map(l => ({ ...l, isCompleted: false })) };
    }));
    res.json({ ...enriched, modules: modulesWithLessons });
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const slug = String(req.params["slug"] ?? "");
      const row = await supabaseRest().selectOne("courses", { slug });
      const restCourse = row ? courseFromRest(row) : null;
      const existingFallback = restCourse ? fallbackCourses.get(restCourse.id) : undefined;
      const restModules = restCourse
        ? await Promise.all((await supabaseRest().selectMany("modules", { course_id: restCourse.id }))
          .map(moduleFromRest)
          .sort((a, b) => a.position - b.position)
          .map(async (mod) => ({
            ...mod,
            lessons: (await supabaseRest().selectMany("lessons", { module_id: mod.id }))
              .map(lessonFromRest)
              .sort((a, b) => a.position - b.position),
          })))
        : [];
      const course = restCourse ? { ...restCourse, modules: restModules.length ? restModules : existingFallback?.modules ?? [] } : undefined;
      if (course) fallbackCourses.set(course.id, course);
      if (!course) { res.status(404).json({ error: "Not found" }); return; }
      res.json(course);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/courses", requireAuth, requireRole("instructor", "admin"), async (req, res) => {
  if (req.user!.id < 0) {
    res.status(401).json({ error: "Your session was created before database writes were enabled. Please sign out and sign up or log in again." });
    return;
  }

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
    if (databaseErrorResponse(err)) {
      const { title, categoryId, level = "beginner", price = 0, ...rest } = req.body;
      const slug = slugify(title);
      const inserted = await supabaseRest().insertOne(
        "courses",
        courseToRestValues({ title, categoryId, level, price, ...rest }, req.user!.id, slug),
      );
      const course = courseFromRest(inserted);
      fallbackCourses.set(course.id, course);
      res.status(201).json(course);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/courses/:courseId", async (req, res) => {
  try {
    const courseId = Number(req.params["courseId"]);
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
    if (databaseErrorResponse(err)) {
      const courseId = Number(req.params["courseId"]);
      const row = await supabaseRest().selectOne("courses", { id: courseId });
      const restCourse = row ? courseFromRest(row) : null;
      const existingFallback = fallbackCourses.get(courseId);
      const restModules = restCourse
        ? await Promise.all((await supabaseRest().selectMany("modules", { course_id: courseId }))
          .map(moduleFromRest)
          .sort((a, b) => a.position - b.position)
          .map(async (mod) => ({
            ...mod,
            lessons: (await supabaseRest().selectMany("lessons", { module_id: mod.id }))
              .map(lessonFromRest)
              .sort((a, b) => a.position - b.position),
          })))
        : [];
      const course = restCourse ? { ...restCourse, modules: restModules.length ? restModules : existingFallback?.modules ?? [] } : existingFallback;
      if (course) fallbackCourses.set(courseId, course);
      if (!course) { res.status(404).json({ error: "Not found" }); return; }
      res.json(course);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/courses/:courseId", requireAuth, async (req, res) => {
  try {
    const courseId = Number(req.params["courseId"]);
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
    if (databaseErrorResponse(err)) {
      const courseId = Number(req.params["courseId"]);
      const existingRow = await supabaseRest().selectOne("courses", { id: courseId });
      const existing = existingRow ? courseFromRest(existingRow) : fallbackCourses.get(courseId);
      if (!existing) { res.status(404).json({ error: "Not found" }); return; }
      if (existing.instructorId !== req.user!.id && req.user!.role !== "admin") {
        res.status(403).json({ error: "Forbidden" }); return;
      }

      const { title, ...rest } = req.body;
      const updates = coursePatchToRestValues(rest);
      if (title) {
        updates["title"] = title;
        updates["slug"] = slugify(title);
      }
      const updatedRow = await supabaseRest().updateOne("courses", { id: courseId }, updates);
      if (!updatedRow) { res.status(404).json({ error: "Not found" }); return; }
      const updated = courseFromRest(updatedRow);
      fallbackCourses.set(courseId, { ...fallbackCourses.get(courseId), ...updated });
      res.json(updated);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/courses/:courseId", requireAuth, async (req, res) => {
  try {
    const courseId = Number(req.params["courseId"]);
    const [existing] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (existing.instructorId !== req.user!.id && req.user!.role !== "admin") {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    await db.delete(coursesTable).where(eq(coursesTable.id, courseId));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const courseId = Number(req.params["courseId"]);
      await supabaseRest().deleteOne("courses", { id: courseId });
      fallbackCourses.delete(courseId);
      res.status(204).send();
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/courses/:courseId/publish", requireAuth, async (req, res) => {
  try {
    const courseId = Number(req.params["courseId"]);
    const { isPublished } = req.body;
    const [existing] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (existing.instructorId !== req.user!.id && req.user!.role !== "admin") {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    const [updated] = await db.update(coursesTable).set({ isPublished, updatedAt: new Date() })
      .where(eq(coursesTable.id, courseId)).returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    const enriched = await enrichCourse(updated);
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const courseId = Number(req.params["courseId"]);
      const existingRow = await supabaseRest().selectOne("courses", { id: courseId });
      const existing = existingRow ? courseFromRest(existingRow) : fallbackCourses.get(courseId);
      if (!existing) { res.status(404).json({ error: "Not found" }); return; }
      if (existing.instructorId !== req.user!.id && req.user!.role !== "admin") {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      const updatedRow = await supabaseRest().updateOne("courses", { id: courseId }, {
        is_published: req.body.isPublished,
        updated_at: new Date().toISOString(),
      });
      if (!updatedRow) { res.status(404).json({ error: "Not found" }); return; }
      const updated = courseFromRest(updatedRow);
      fallbackCourses.set(courseId, updated);
      res.json(updated);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/courses/:courseId/stats", requireAuth, async (req, res) => {
  try {
    const courseId = Number(req.params["courseId"]);
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
    const courseId = Number(req.params["courseId"]);
    const enrollments = await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.courseId, courseId));
    res.json(enrollments.map(e => ({ ...e, course: null, progressPercent: 0 })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
