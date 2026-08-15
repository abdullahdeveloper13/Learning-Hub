import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, conversationParticipantsTable, messagesTable, usersTable, discussionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { databaseErrorResponse } from "../lib/httpErrors";

const router = Router();

router.get("/messages/conversations", requireAuth, async (req, res) => {
  try {
    const myParticipations = await db.select().from(conversationParticipantsTable)
      .where(eq(conversationParticipantsTable.userId, req.user!.id));
    const convs = await Promise.all(myParticipations.map(async p => {
      const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, p.conversationId)).limit(1);
      if (!conv) return null;
      const allParticipants = await db.select().from(conversationParticipantsTable).where(eq(conversationParticipantsTable.conversationId, conv.id));
      const participants = await Promise.all(allParticipants.map(async ap => {
        const [u] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, avatarUrl: usersTable.avatarUrl, bio: usersTable.bio, isActive: usersTable.isActive, createdAt: usersTable.createdAt }).from(usersTable).where(eq(usersTable.id, ap.userId)).limit(1);
        return u;
      }));
      const [lastMsg] = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, conv.id)).orderBy(sql`created_at desc`).limit(1);
      return { ...conv, participants: participants.filter(Boolean), lastMessage: lastMsg?.content ?? null, lastMessageAt: lastMsg?.createdAt?.toISOString() ?? null, unreadCount: 0, createdAt: conv.createdAt.toISOString() };
    }));
    res.json(convs.filter(Boolean));
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      res.json([]);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/messages/conversations", requireAuth, async (req, res) => {
  try {
    const { participantId } = req.body;
    const [conv] = await db.insert(conversationsTable).values({}).returning();
    await db.insert(conversationParticipantsTable).values([
      { conversationId: conv.id, userId: req.user!.id },
      { conversationId: conv.id, userId: participantId },
    ]);
    const [u1] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, avatarUrl: usersTable.avatarUrl, bio: usersTable.bio, isActive: usersTable.isActive, createdAt: usersTable.createdAt }).from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
    const [u2] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, avatarUrl: usersTable.avatarUrl, bio: usersTable.bio, isActive: usersTable.isActive, createdAt: usersTable.createdAt }).from(usersTable).where(eq(usersTable.id, participantId)).limit(1);
    res.status(201).json({ ...conv, participants: [u1, u2].filter(Boolean), lastMessage: null, lastMessageAt: null, unreadCount: 0, createdAt: conv.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/messages/conversations/:conversationId", requireAuth, async (req, res) => {
  try {
    const convId = Number(req.params["conversationId"]);
    const msgs = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, convId)).orderBy(sql`created_at asc`);
    const enriched = await Promise.all(msgs.map(async m => {
      const [u] = await db.select({ name: usersTable.name, avatarUrl: usersTable.avatarUrl }).from(usersTable).where(eq(usersTable.id, m.senderId)).limit(1);
      return { ...m, senderName: u?.name ?? "Unknown", senderAvatar: u?.avatarUrl ?? null, createdAt: m.createdAt.toISOString() };
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/messages/conversations/:conversationId", requireAuth, async (req, res) => {
  try {
    const convId = Number(req.params["conversationId"]);
    const { content } = req.body;
    const [msg] = await db.insert(messagesTable).values({ conversationId: convId, senderId: req.user!.id, content }).returning();
    const [u] = await db.select({ name: usersTable.name, avatarUrl: usersTable.avatarUrl }).from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
    res.status(201).json({ ...msg, senderName: u?.name ?? "Unknown", senderAvatar: u?.avatarUrl ?? null, createdAt: msg.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/courses/:courseId/discussions", async (req, res) => {
  try {
    const courseId = Number(req.params["courseId"]);
    const discussions = await db.select().from(discussionsTable).where(eq(discussionsTable.courseId, courseId)).orderBy(sql`created_at desc`);
    const enriched = await Promise.all(discussions.map(async d => {
      const [u] = await db.select({ name: usersTable.name, avatarUrl: usersTable.avatarUrl, role: usersTable.role }).from(usersTable).where(eq(usersTable.id, d.userId)).limit(1);
      const replies = discussions.filter(r => r.parentId === d.id);
      return { ...d, userName: u?.name ?? "Unknown", userAvatar: u?.avatarUrl ?? null, userRole: u?.role ?? "student", replies: [], createdAt: d.createdAt.toISOString() };
    }));
    res.json(enriched.filter(d => !d.parentId));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/courses/:courseId/discussions", requireAuth, async (req, res) => {
  try {
    const courseId = Number(req.params["courseId"]);
    const { content, parentId } = req.body;
    const [discussion] = await db.insert(discussionsTable).values({ courseId, userId: req.user!.id, content, parentId }).returning();
    const [u] = await db.select({ name: usersTable.name, avatarUrl: usersTable.avatarUrl, role: usersTable.role }).from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
    res.status(201).json({ ...discussion, userName: u?.name ?? "Unknown", userAvatar: u?.avatarUrl ?? null, userRole: u?.role ?? "student", replies: [], createdAt: discussion.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
