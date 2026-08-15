import { Router } from "express";
import { db } from "@workspace/db";
import {
  enrollmentsTable, coursesTable, certificatesTable, assignmentsTable,
  usersTable, activityLogsTable, reviewsTable, categoriesTable,
  modulesTable, lessonsTable, lessonProgressTable
} from "@workspace/db";
import { eq, sql, gte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { databaseErrorResponse } from "../lib/httpErrors";

const router = Router();

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function generateDatePoints(days: number) {
  const points = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    points.push(d.toISOString().slice(0, 10));
  }
  return points;
}

function countRowsByDate<T>(dates: string[], rows: T[], getDate: (row: T) => Date | null | undefined) {
  const counts = new Map(dates.map(date => [date, 0]));
  for (const row of rows) {
    const value = getDate(row);
    if (!value) continue;
    const date = value.toISOString().slice(0, 10);
    if (counts.has(date)) counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return counts;
}

router.get("/dashboard/student", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const enrollments = await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.userId, userId));
    const certs = await db.select().from(certificatesTable).where(eq(certificatesTable.userId, userId));
    const completed = enrollments.filter(e => e.completedAt).length;
    const inProgress = enrollments.length - completed;

    const upcomingDeadlines = await db.select().from(assignmentsTable)
      .where(gte(assignmentsTable.dueDate, new Date())).limit(5);

    const courseProgress = await Promise.all(enrollments.slice(0, 5).map(async (e) => {
      const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, e.courseId)).limit(1);
      const modules = await db.select({ id: modulesTable.id }).from(modulesTable).where(eq(modulesTable.courseId, e.courseId));
      let totalLessons = 0;
      let completedLessons = 0;
      for (const module of modules) {
        const lessons = await db.select({ id: lessonsTable.id }).from(lessonsTable).where(eq(lessonsTable.moduleId, module.id));
        totalLessons += lessons.length;
        for (const lesson of lessons) {
          const [progress] = await db.select({ id: lessonProgressTable.id })
            .from(lessonProgressTable)
            .where(sql`${lessonProgressTable.userId} = ${userId} and ${lessonProgressTable.lessonId} = ${lesson.id}`)
            .limit(1);
          if (progress) completedLessons += 1;
        }
      }
      const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      return {
        courseId: e.courseId,
        userId,
        progressPercent,
        completedLessons,
        totalLessons,
        lastLessonId: null,
        completedAt: e.completedAt,
        course,
      };
    }));

    const weekDates = generateDatePoints(7);
    const recentLessonProgress = await db.select().from(lessonProgressTable)
      .where(sql`${lessonProgressTable.userId} = ${userId} and ${lessonProgressTable.completedAt} >= ${daysAgo(7)}`);
    const completedByDate = countRowsByDate(weekDates, recentLessonProgress, row => row.completedAt);
    const weeklyProgress = weekDates.map(date => ({ date, minutes: (completedByDate.get(date) ?? 0) * 15 }));

    const deadlines = await Promise.all(upcomingDeadlines.map(async a => {
      const enroll = enrollments.find(e => e.courseId === a.courseId);
      const [course] = await db.select({ title: coursesTable.title }).from(coursesTable).where(eq(coursesTable.id, a.courseId)).limit(1);
      return {
        id: a.id, type: "assignment" as const, title: a.title,
        dueDate: a.dueDate.toISOString(), courseId: a.courseId, courseTitle: enroll ? course?.title ?? "Enrolled course" : course?.title ?? "Available course"
      };
    }));

    res.json({
      enrolledCourses: enrollments.length,
      completedCourses: completed,
      inProgressCourses: inProgress,
      totalCertificates: certs.length,
      upcomingDeadlines: deadlines,
      recentActivity: [],
      weeklyProgress,
      currentCourses: courseProgress,
    });
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      res.json({
        enrolledCourses: 0,
        completedCourses: 0,
        inProgressCourses: 0,
        totalCertificates: 0,
        upcomingDeadlines: [],
        recentActivity: [],
        weeklyProgress: generateDatePoints(7).map(date => ({ date, minutes: 0 })),
        currentCourses: [],
        databaseStatus: "unavailable",
      });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/instructor", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const courses = await db.select().from(coursesTable).where(eq(coursesTable.instructorId, userId));
    const published = courses.filter(c => c.isPublished);
    let totalStudents = 0, totalRevenue = 0, totalRating = 0, reviewCount = 0;
    for (const c of courses) {
      const [cnt] = await db.select({ count: sql<number>`count(*)::int` }).from(enrollmentsTable).where(eq(enrollmentsTable.courseId, c.id));
      const students = cnt?.count ?? 0;
      totalStudents += students;
      totalRevenue += students * (c.price || 0);
      const reviews = await db.select({ rating: reviewsTable.rating }).from(reviewsTable).where(eq(reviewsTable.courseId, c.id));
      reviews.forEach(r => { totalRating += r.rating; reviewCount++; });
    }
    const recentEnrollments = [];
    for (const c of courses.slice(0, 5)) {
      const rows = await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.courseId, c.id)).limit(3);
      recentEnrollments.push(...rows.map((enrollment) => ({ ...enrollment, course: c, progressPercent: 0 })));
    }
    const revenueDates = generateDatePoints(30);
    const revenueByDay = new Map(revenueDates.map(date => [date, 0]));
    for (const enrollment of recentEnrollments) {
      const date = enrollment.enrolledAt.toISOString().slice(0, 10);
      if (revenueByDay.has(date)) {
        revenueByDay.set(date, (revenueByDay.get(date) ?? 0) + (enrollment.course?.price ?? 0));
      }
    }
    const revenueByMonth = revenueDates.map(date => ({ date, revenue: revenueByDay.get(date) ?? 0 }));

    res.json({
      totalCourses: courses.length,
      publishedCourses: published.length,
      totalStudents,
      totalRevenue,
      averageRating: reviewCount > 0 ? totalRating / reviewCount : 0,
      recentEnrollments: recentEnrollments
        .sort((a, b) => b.enrolledAt.getTime() - a.enrolledAt.getTime())
        .slice(0, 8),
      topCourses: courses.slice(0, 3),
      revenueByMonth,
    });
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      res.json({
        totalCourses: 0,
        publishedCourses: 0,
        totalStudents: 0,
        totalRevenue: 0,
        averageRating: 0,
        recentEnrollments: [],
        topCourses: [],
        revenueByMonth: generateDatePoints(6).map(date => ({ date, revenue: 0 })),
      });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/admin", requireAuth, async (req, res) => {
  try {
    const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
    const [courseCount] = await db.select({ count: sql<number>`count(*)::int` }).from(coursesTable);
    const [enrollCount] = await db.select({ count: sql<number>`count(*)::int` }).from(enrollmentsTable);
    const [publishedCount] = await db.select({ count: sql<number>`count(*)::int` }).from(coursesTable).where(eq(coursesTable.isPublished, true));
    const [newToday] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(gte(usersTable.createdAt, daysAgo(1)));

    const dates = generateDatePoints(7);
    const recentUsers = await db.select({ createdAt: usersTable.createdAt }).from(usersTable).where(gte(usersTable.createdAt, daysAgo(7)));
    const recentCourses = await db.select({ createdAt: coursesTable.createdAt }).from(coursesTable).where(gte(coursesTable.createdAt, daysAgo(7)));
    const recentEnrollments = await db.select({ enrolledAt: enrollmentsTable.enrolledAt }).from(enrollmentsTable).where(gte(enrollmentsTable.enrolledAt, daysAgo(7)));
    const usersByDate = countRowsByDate(dates, recentUsers, row => row.createdAt);
    const coursesByDate = countRowsByDate(dates, recentCourses, row => row.createdAt);
    const enrollmentsByDate = countRowsByDate(dates, recentEnrollments, row => row.enrolledAt);
    const platformGrowth = dates.map(date => ({
      date,
      users: usersByDate.get(date) ?? 0,
      courses: coursesByDate.get(date) ?? 0,
      enrollments: enrollmentsByDate.get(date) ?? 0,
    }));

    const cats = await db.select().from(categoriesTable);
    const categoryBreakdown = await Promise.all(cats.map(async cat => {
      const [cc] = await db.select({ count: sql<number>`count(*)::int` }).from(coursesTable).where(eq(coursesTable.categoryId, cat.id));
      const [ec] = await db.select({ count: sql<number>`count(*)::int` })
        .from(enrollmentsTable)
        .innerJoin(coursesTable, eq(enrollmentsTable.courseId, coursesTable.id))
        .where(eq(coursesTable.categoryId, cat.id));
      return { categoryId: cat.id, name: cat.name, courseCount: cc?.count ?? 0, enrollmentCount: ec?.count ?? 0 };
    }));

    res.json({
      totalUsers: userCount?.count ?? 0,
      totalCourses: courseCount?.count ?? 0,
      totalEnrollments: enrollCount?.count ?? 0,
      totalRevenue: (enrollCount?.count ?? 0) * 49.99,
      newUsersToday: newToday?.count ?? 0,
      activeCourses: publishedCount?.count ?? 0,
      platformGrowth,
      categoryBreakdown,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/revenue", requireAuth, async (req, res) => {
  try {
    const { period = "30d" } = req.query as Record<string, string>;
    const days = period === "7d" ? 7 : period === "90d" ? 90 : period === "1y" ? 365 : 30;
    const dates = generateDatePoints(days);
    const enrollments = await db.select({
      enrolledAt: enrollmentsTable.enrolledAt,
      price: coursesTable.price,
    })
      .from(enrollmentsTable)
      .innerJoin(coursesTable, eq(enrollmentsTable.courseId, coursesTable.id))
      .where(gte(enrollmentsTable.enrolledAt, daysAgo(days)));
    const revenueByDate = new Map(dates.map(date => [date, 0]));
    for (const enrollment of enrollments) {
      const date = enrollment.enrolledAt.toISOString().slice(0, 10);
      if (revenueByDate.has(date)) revenueByDate.set(date, (revenueByDate.get(date) ?? 0) + (enrollment.price ?? 0));
    }
    const points = dates.map(date => ({ date, revenue: revenueByDate.get(date) ?? 0 }));
    res.json(points);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/activity", requireAuth, async (req, res) => {
  try {
    const logs = await db.select().from(activityLogsTable).orderBy(sql`created_at desc`).limit(20);
    const enriched = await Promise.all(logs.map(async l => {
      let userName: string | null = null, userAvatar: string | null = null;
      if (l.userId) {
        const [u] = await db.select({ name: usersTable.name, avatarUrl: usersTable.avatarUrl }).from(usersTable).where(eq(usersTable.id, l.userId)).limit(1);
        userName = u?.name ?? null;
        userAvatar = u?.avatarUrl ?? null;
      }
      return { ...l, userName, userAvatar, createdAt: l.createdAt.toISOString() };
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/enrollment-stats", requireAuth, async (req, res) => {
  try {
    const { period = "30d" } = req.query as Record<string, string>;
    const days = period === "7d" ? 7 : period === "90d" ? 90 : period === "1y" ? 365 : 30;
    const dates = generateDatePoints(days);
    const enrollments = await db.select({ enrolledAt: enrollmentsTable.enrolledAt })
      .from(enrollmentsTable)
      .where(gte(enrollmentsTable.enrolledAt, daysAgo(days)));
    const counts = countRowsByDate(dates, enrollments, row => row.enrolledAt);
    const points = dates.map(date => ({ date, count: counts.get(date) ?? 0 }));
    res.json(points);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
