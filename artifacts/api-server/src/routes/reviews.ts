import { Router } from "express";
import { db } from "@workspace/db";
import { reviewsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { databaseErrorResponse } from "../lib/httpErrors";
import { supabaseRest } from "../lib/supabaseRest";

const router = Router();

function reviewFromRest(row: any) {
  return {
    id: row.id,
    courseId: row.course_id,
    userId: row.user_id,
    rating: row.rating,
    comment: row.comment,
    instructorReply: row.instructor_reply,
    createdAt: new Date(row.created_at),
  };
}

async function enrichRestReview(row: any) {
  const review = reviewFromRest(row);
  const user = await supabaseRest().selectOne("users", { id: review.userId });
  return { ...review, userName: user?.name ?? "Unknown", userAvatar: user?.avatar_url ?? null };
}

async function enrichReview(review: typeof reviewsTable.$inferSelect) {
  const [user] = await db.select({ name: usersTable.name, avatarUrl: usersTable.avatarUrl }).from(usersTable).where(eq(usersTable.id, review.userId)).limit(1);
  return { ...review, userName: user?.name ?? "Unknown", userAvatar: user?.avatarUrl ?? null };
}

router.get("/courses/:courseId/reviews", async (req, res) => {
  try {
    const courseId = Number(req.params["courseId"]);
    const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.courseId, courseId));
    const enriched = await Promise.all(reviews.map(enrichReview));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const courseId = Number(req.params["courseId"]);
      const reviews = await supabaseRest().selectMany("reviews", { course_id: courseId });
      res.json(await Promise.all(reviews.map(enrichRestReview)));
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/courses/:courseId/reviews", requireAuth, async (req, res) => {
  try {
    const courseId = Number(req.params["courseId"]);
    const { rating, comment } = req.body;
    const [review] = await db.insert(reviewsTable).values({ courseId, userId: req.user!.id, rating, comment }).returning();
    const enriched = await enrichReview(review);
    res.status(201).json(enriched);
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const courseId = Number(req.params["courseId"]);
      const { rating, comment } = req.body;
      const inserted = await supabaseRest().insertOne("reviews", {
        course_id: courseId,
        user_id: req.user!.id,
        rating,
        comment: comment ?? null,
      });
      res.status(201).json(await enrichRestReview(inserted));
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/reviews/:reviewId", requireAuth, async (req, res) => {
  try {
    const reviewId = Number(req.params["reviewId"]);
    const updates: Record<string, unknown> = {};
    for (const f of ["rating", "comment", "instructorReply"]) if (req.body[f] !== undefined) updates[f] = req.body[f];
    const [review] = await db.update(reviewsTable).set(updates).where(eq(reviewsTable.id, reviewId)).returning();
    if (!review) { res.status(404).json({ error: "Not found" }); return; }
    const enriched = await enrichReview(review);
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const reviewId = Number(req.params["reviewId"]);
      const updates: Record<string, unknown> = {};
      if (req.body.rating !== undefined) updates["rating"] = req.body.rating;
      if (req.body.comment !== undefined) updates["comment"] = req.body.comment;
      if (req.body.instructorReply !== undefined) updates["instructor_reply"] = req.body.instructorReply;
      const row = await supabaseRest().updateOne("reviews", { id: reviewId }, updates);
      if (!row) { res.status(404).json({ error: "Not found" }); return; }
      res.json(await enrichRestReview(row));
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/reviews/:reviewId", requireAuth, async (req, res) => {
  try {
    const reviewId = Number(req.params["reviewId"]);
    await db.delete(reviewsTable).where(eq(reviewsTable.id, reviewId));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const reviewId = Number(req.params["reviewId"]);
      await supabaseRest().deleteOne("reviews", { id: reviewId });
      res.status(204).send();
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
