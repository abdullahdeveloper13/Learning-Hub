import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, ilike, and, or } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/users", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { role, search, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (role) conditions.push(eq(usersTable.role, role as "student" | "instructor" | "admin"));
    if (search) conditions.push(or(ilike(usersTable.name, `%${search}%`), ilike(usersTable.email, `%${search}%`)));

    const query = db.select({
      id: usersTable.id, email: usersTable.email, name: usersTable.name,
      role: usersTable.role, avatarUrl: usersTable.avatarUrl, bio: usersTable.bio,
      isActive: usersTable.isActive, createdAt: usersTable.createdAt
    }).from(usersTable);

    const users = conditions.length > 0
      ? await query.where(and(...conditions)).limit(limitNum).offset(offset)
      : await query.limit(limitNum).offset(offset);

    const total = users.length;
    res.json({ users, total, page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/:userId", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.params["userId"]);
    const [user] = await db.select({
      id: usersTable.id, email: usersTable.email, name: usersTable.name,
      role: usersTable.role, avatarUrl: usersTable.avatarUrl, bio: usersTable.bio,
      isActive: usersTable.isActive, createdAt: usersTable.createdAt
    }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "Not found" }); return; }
    res.json(user);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/users/:userId", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.params["userId"]);
    if (req.user!.id !== userId && req.user!.role !== "admin") {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    const { name, bio, avatarUrl, password } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name) updates["name"] = name;
    if (bio !== undefined) updates["bio"] = bio;
    if (avatarUrl !== undefined) updates["avatarUrl"] = avatarUrl;
    if (password) updates["passwordHash"] = await bcrypt.hash(password, 10);

    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning({
      id: usersTable.id, email: usersTable.email, name: usersTable.name,
      role: usersTable.role, avatarUrl: usersTable.avatarUrl, bio: usersTable.bio,
      isActive: usersTable.isActive, createdAt: usersTable.createdAt
    });
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/users/:userId", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const userId = Number(req.params["userId"]);
    await db.delete(usersTable).where(eq(usersTable.id, userId));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/users/:userId/role", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const userId = Number(req.params["userId"]);
    const { role } = req.body;
    const [updated] = await db.update(usersTable).set({ role }).where(eq(usersTable.id, userId)).returning({
      id: usersTable.id, email: usersTable.email, name: usersTable.name,
      role: usersTable.role, avatarUrl: usersTable.avatarUrl, bio: usersTable.bio,
      isActive: usersTable.isActive, createdAt: usersTable.createdAt
    });
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
