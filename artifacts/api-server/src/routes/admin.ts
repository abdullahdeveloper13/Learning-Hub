import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, coursesTable, enrollmentsTable, certificatesTable,
  announcementsTable, activityLogsTable, notificationsTable
} from "@workspace/db";
import { eq, sql, gte, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/admin/stats", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const [users] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
    const [students] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.role, "student"));
    const [instructors] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.role, "instructor"));
    const [admins] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.role, "admin"));
    const [courses] = await db.select({ count: sql<number>`count(*)::int` }).from(coursesTable);
    const [published] = await db.select({ count: sql<number>`count(*)::int` }).from(coursesTable).where(eq(coursesTable.isPublished, true));
    const [enrollments] = await db.select({ count: sql<number>`count(*)::int` }).from(enrollmentsTable);
    const [certs] = await db.select({ count: sql<number>`count(*)::int` }).from(certificatesTable);
    res.json({
      totalUsers: users?.count ?? 0,
      totalStudents: students?.count ?? 0,
      totalInstructors: instructors?.count ?? 0,
      totalAdmins: admins?.count ?? 0,
      totalCourses: courses?.count ?? 0,
      publishedCourses: published?.count ?? 0,
      totalEnrollments: enrollments?.count ?? 0,
      totalRevenue: (enrollments?.count ?? 0) * 49.99,
      totalCertificates: certs?.count ?? 0,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/announcements", async (_req, res) => {
  try {
    const announcements = await db.select().from(announcementsTable).orderBy(desc(announcementsTable.createdAt));
    const enriched = await Promise.all(announcements.map(async a => {
      const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, a.createdBy)).limit(1);
      return { ...a, createdByName: u?.name ?? "Admin", createdAt: a.createdAt.toISOString() };
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/announcements", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { title, body, targetRole } = req.body;
    const [announcement] = await db.insert(announcementsTable).values({ title, body, targetRole, createdBy: req.user!.id }).returning();
    // Notify all users or role-specific users
    const usersToNotify = targetRole
      ? await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, targetRole as "student" | "instructor"))
      : await db.select({ id: usersTable.id }).from(usersTable);
    for (const u of usersToNotify) {
      await db.insert(notificationsTable).values({ userId: u.id, type: "announcement", title, body, link: "/notifications" }).catch(() => {});
    }
    const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
    res.status(201).json({ ...announcement, createdByName: user?.name ?? "Admin", createdAt: announcement.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/announcements/:announcementId", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params["announcementId"]!);
    await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/activity-logs", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { page = "1", limit = "20" } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const logs = await db.select().from(activityLogsTable).orderBy(desc(activityLogsTable.createdAt)).limit(parseInt(limit)).offset(offset);
    const enriched = await Promise.all(logs.map(async l => {
      let userName: string | null = null;
      if (l.userId) {
        const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, l.userId)).limit(1);
        userName = u?.name ?? null;
      }
      return { ...l, userName, createdAt: l.createdAt.toISOString() };
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
