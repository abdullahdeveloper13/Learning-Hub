import { Router } from "express";
import { db } from "@workspace/db";
import { reviewsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

async function enrichReview(review: typeof reviewsTable.$inferSelect) {
  const [user] = await db.select({ name: usersTable.name, avatarUrl: usersTable.avatarUrl }).from(usersTable).where(eq(usersTable.id, review.userId)).limit(1);
  return { ...review, userName: user?.name ?? "Unknown", userAvatar: user?.avatarUrl ?? null };
}

router.get("/courses/:courseId/reviews", async (req, res) => {
  try {
    const courseId = parseInt(req.params["courseId"]!);
    const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.courseId, courseId));
    const enriched = await Promise.all(reviews.map(enrichReview));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/courses/:courseId/reviews", requireAuth, async (req, res) => {
  try {
    const courseId = parseInt(req.params["courseId"]!);
    const { rating, comment } = req.body;
    const [review] = await db.insert(reviewsTable).values({ courseId, userId: req.user!.id, rating, comment }).returning();
    const enriched = await enrichReview(review);
    res.status(201).json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/reviews/:reviewId", requireAuth, async (req, res) => {
  try {
    const reviewId = parseInt(req.params["reviewId"]!);
    const updates: Record<string, unknown> = {};
    for (const f of ["rating", "comment", "instructorReply"]) if (req.body[f] !== undefined) updates[f] = req.body[f];
    const [review] = await db.update(reviewsTable).set(updates).where(eq(reviewsTable.id, reviewId)).returning();
    if (!review) { res.status(404).json({ error: "Not found" }); return; }
    const enriched = await enrichReview(review);
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/reviews/:reviewId", requireAuth, async (req, res) => {
  try {
    const reviewId = parseInt(req.params["reviewId"]!);
    await db.delete(reviewsTable).where(eq(reviewsTable.id, reviewId));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
