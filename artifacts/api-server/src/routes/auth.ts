import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, signToken } from "../middlewares/auth";
import { databaseErrorResponse } from "../lib/httpErrors";
import { supabaseRest } from "../lib/supabaseRest";

const router = Router();
const devAuthUsers = new Map<string, {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  role: "student" | "instructor" | "admin";
  avatarUrl: string | null;
  bio: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}>();

function safeUser(user: {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  role: "student" | "instructor" | "admin";
  avatarUrl: string | null;
  bio: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { passwordHash: _, ...rest } = user;
  return rest;
}

function userFromRest(row: any) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    role: row.role,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

router.post("/auth/register", async (req, res) => {
  try {
    const { email, password, name, role = "student" } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: "email, password, and name are required" });
      return;
    }
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Email already in use" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(usersTable).values({ email, passwordHash, name, role: role as "student" | "instructor" }).returning();
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    const { passwordHash: _, ...safeUser } = user;
    res.status(201).json({ user: safeUser, token });
  } catch (err) {
    req.log.error(err);
    const dbError = databaseErrorResponse(err);
    if (dbError) {
      const { email, password, name, role = "student" } = req.body;
      const normalizedEmail = String(email).toLowerCase();
      const rest = supabaseRest();
      const existingRow = await rest.selectOne("users", { email: normalizedEmail });
      const existing = existingRow ? userFromRest(existingRow) : devAuthUsers.get(normalizedEmail);
      if (existing) {
        res.status(400).json({ error: "Email already in use" });
        return;
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const inserted = await rest.insertOne("users", {
        email: normalizedEmail,
        name,
        password_hash: passwordHash,
        role,
        is_active: true,
      });
      const user = userFromRest(inserted);
      devAuthUsers.set(normalizedEmail, user);
      const token = signToken({ id: user.id, email: user.email, role: user.role });
      res.status(201).json({ user: safeUser(user), token });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user || !user.isActive) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    const { passwordHash: _, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    req.log.error(err);
    const dbError = databaseErrorResponse(err);
    if (dbError) {
      const { email, password } = req.body;
      const normalizedEmail = String(email).toLowerCase();
      const existingRow = await supabaseRest().selectOne("users", { email: normalizedEmail });
      const user = existingRow ? userFromRest(existingRow) : devAuthUsers.get(normalizedEmail);
      if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const token = signToken({ id: user.id, email: user.email, role: user.role });
      res.json({ user: safeUser(user), token });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", (_req, res) => {
  res.json({ success: true });
});

router.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
    if (!user) { res.status(404).json({ error: "Not found" }); return; }
    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    req.log.error(err);
    const dbError = databaseErrorResponse(err);
    if (dbError) {
      const existingRow = await supabaseRest().selectOne("users", { id: req.user!.id });
      const user = existingRow ? userFromRest(existingRow) : devAuthUsers.get(req.user!.email.toLowerCase());
      if (user) {
        res.json(safeUser(user));
        return;
      }
      res.status(dbError.status).json(dbError.body);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
