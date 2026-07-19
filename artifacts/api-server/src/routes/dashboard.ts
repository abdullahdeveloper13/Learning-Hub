import { Router } from "express";
import { db } from "@workspace/db";
import {
  enrollmentsTable, coursesTable, certificatesTable, assignmentsTable,
  usersTable, activityLogsTable, reviewsTable, categoriesTable
} from "@workspace/db";
import { eq, sql, and, gte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

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

router.get("/dashboard/student", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const enrollments = await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.userId, userId));
    const certs = await db.select().from(certificatesTable).where(eq(certificatesTable.userId, userId));
    const completed = enrollments.filter(e => e.completedAt).length;
    const inProgress = enrollments.length - completed;

    const upcomingDeadlines = await db.select().from(assignmentsTable)
      .where(gte(assignmentsTable.dueDate, new Date())).limit(5);

    const courseProgress = await Promise.all(enrollments.slice(0, 5).map(async e => {
      const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, e.courseId)).limit(1);
      return { courseId: e.courseId, userId, progressPercent: Math.floor(Math.random() * 80) + 10, completedLessons: 3, totalLessons: 10, lastLessonId: null, completedAt: null };
    }));

    const weeklyProgress = generateDatePoints(7).map(date => ({
      date, minutes: Math.floor(Math.random() * 90) + 10
    }));

    const deadlines = upcomingDeadlines.map(a => {
      const enroll = enrollments.find(e => e.courseId === a.courseId);
      return {
        id: a.id, type: "assignment" as const, title: a.title,
        dueDate: a.dueDate.toISOString(), courseId: a.courseId, courseTitle: "Course"
      };
    });

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
    const revenueByMonth = generateDatePoints(6).map((date, i) => ({ date, revenue: Math.floor(Math.random() * 2000) + 500 }));
    res.json({
      totalCourses: courses.length,
      publishedCourses: published.length,
      totalStudents,
      totalRevenue,
      averageRating: reviewCount > 0 ? totalRating / reviewCount : 0,
      recentEnrollments: [],
      topCourses: courses.slice(0, 3),
      revenueByMonth,
    });
  } catch (err) {
    req.log.error(err);
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

    const platformGrowth = generateDatePoints(7).map(date => ({
      date,
      users: Math.floor(Math.random() * 50) + 10,
      courses: Math.floor(Math.random() * 10) + 1,
      enrollments: Math.floor(Math.random() * 100) + 20,
    }));

    const cats = await db.select().from(categoriesTable);
    const categoryBreakdown = await Promise.all(cats.map(async cat => {
      const [cc] = await db.select({ count: sql<number>`count(*)::int` }).from(coursesTable).where(eq(coursesTable.categoryId, cat.id));
      const [ec] = await db.select({ count: sql<number>`count(*)::int` }).from(enrollmentsTable);
      return { categoryId: cat.id, name: cat.name, courseCount: cc?.count ?? 0, enrollmentCount: Math.floor(Math.random() * 100) };
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
    const points = generateDatePoints(days).map(date => ({ date, revenue: Math.floor(Math.random() * 5000) + 500 }));
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
    const points = generateDatePoints(days).map(date => ({ date, count: Math.floor(Math.random() * 30) + 1 }));
    res.json(points);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
