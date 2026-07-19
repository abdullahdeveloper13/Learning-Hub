import { Router } from "express";
import { db } from "@workspace/db";
import { quizzesTable, questionsTable, quizAttemptsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/courses/:courseId/quizzes", async (req, res) => {
  try {
    const courseId = parseInt(req.params["courseId"]!);
    const quizzes = await db.select().from(quizzesTable).where(eq(quizzesTable.courseId, courseId));
    const result = await Promise.all(quizzes.map(async q => {
      const [cnt] = await db.select({ count: sql<number>`count(*)::int` }).from(questionsTable).where(eq(questionsTable.quizId, q.id));
      return { ...q, questionCount: cnt?.count ?? 0, attempts: 0 };
    }));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/courses/:courseId/quizzes", requireAuth, async (req, res) => {
  try {
    const courseId = parseInt(req.params["courseId"]!);
    const { title, description, timeLimit, passingScore = 70, lessonId, isFinalExam = false, shuffleQuestions = false, maxAttempts = 3, questions = [] } = req.body;
    const [quiz] = await db.insert(quizzesTable).values({ courseId, title, description, timeLimit, passingScore, lessonId, isFinalExam, shuffleQuestions, maxAttempts }).returning();
    if (questions.length > 0) {
      await db.insert(questionsTable).values(questions.map((q: any, i: number) => ({
        quizId: quiz.id, text: q.text, type: q.type ?? "multiple_choice",
        options: q.options ?? [], correctAnswer: q.correctAnswer ?? null,
        explanation: q.explanation ?? null, position: q.position ?? i, points: q.points ?? 1,
      })));
    }
    res.status(201).json({ ...quiz, questionCount: questions.length, attempts: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/quizzes/:quizId", async (req, res) => {
  try {
    const quizId = parseInt(req.params["quizId"]!);
    const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, quizId)).limit(1);
    if (!quiz) { res.status(404).json({ error: "Not found" }); return; }
    const questions = await db.select().from(questionsTable).where(eq(questionsTable.quizId, quizId));
    res.json({ ...quiz, questionCount: questions.length, attempts: 0, questions });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/quizzes/:quizId", requireAuth, async (req, res) => {
  try {
    const quizId = parseInt(req.params["quizId"]!);
    const { questions, ...rest } = req.body;
    const updates: Record<string, unknown> = {};
    for (const f of ["title", "description", "timeLimit", "passingScore", "isFinalExam", "shuffleQuestions", "maxAttempts"]) {
      if (rest[f] !== undefined) updates[f] = rest[f];
    }
    const [quiz] = await db.update(quizzesTable).set(updates).where(eq(quizzesTable.id, quizId)).returning();
    if (!quiz) { res.status(404).json({ error: "Not found" }); return; }

    // Replace all questions if provided
    if (Array.isArray(questions)) {
      await db.delete(questionsTable).where(eq(questionsTable.quizId, quizId));
      if (questions.length > 0) {
        await db.insert(questionsTable).values(questions.map((q: any, i: number) => ({
          quizId, text: q.text, type: q.type ?? "multiple_choice",
          options: q.options ?? [], correctAnswer: q.correctAnswer ?? null,
          explanation: q.explanation ?? null, position: q.position ?? i, points: q.points ?? 1,
        })));
      }
    }

    const savedQuestions = await db.select().from(questionsTable).where(eq(questionsTable.quizId, quizId));
    res.json({ ...quiz, questionCount: savedQuestions.length, questions: savedQuestions });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/quizzes/:quizId", requireAuth, async (req, res) => {
  try {
    const quizId = parseInt(req.params["quizId"]!);
    await db.delete(quizzesTable).where(eq(quizzesTable.id, quizId));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/quizzes/:quizId/submit", requireAuth, async (req, res) => {
  try {
    const quizId = parseInt(req.params["quizId"]!);
    const { answers } = req.body as { answers: { questionId: number; answer: string }[] };
    const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, quizId)).limit(1);
    if (!quiz) { res.status(404).json({ error: "Not found" }); return; }
    const questions = await db.select().from(questionsTable).where(eq(questionsTable.quizId, quizId));
    let totalPoints = 0, earnedPoints = 0;
    const answerResults = answers.map(a => {
      const q = questions.find(q => q.id === a.questionId);
      if (!q) return { questionId: a.questionId, answer: a.answer, isCorrect: false, points: 0 };
      totalPoints += q.points;
      const opts = (q.options || []) as { id: string; text: string; isCorrect: boolean }[];
      const isCorrect =
        a.answer === q.correctAnswer ||
        opts.find(o => o.id === a.answer)?.isCorrect === true ||
        (q.type === "true_false" && a.answer?.toLowerCase() === q.correctAnswer?.toLowerCase());
      if (isCorrect) earnedPoints += q.points;
      return { questionId: a.questionId, answer: a.answer, isCorrect: !!isCorrect, points: isCorrect ? q.points : 0 };
    });
    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= quiz.passingScore;
    await db.insert(quizAttemptsTable).values({ quizId, userId: req.user!.id, score, passed, answers: answerResults });
    res.json({ score, passed, totalPoints, earnedPoints, answers: answerResults, passingScore: quiz.passingScore });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/quizzes/:quizId/attempts", requireAuth, async (req, res) => {
  try {
    const quizId = parseInt(req.params["quizId"]!);
    const attempts = await db.select().from(quizAttemptsTable).where(eq(quizAttemptsTable.quizId, quizId));
    res.json(attempts);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/quizzes/:quizId/leaderboard", async (req, res) => {
  try {
    const quizId = parseInt(req.params["quizId"]!);
    const attempts = await db.select().from(quizAttemptsTable).where(eq(quizAttemptsTable.quizId, quizId));
    const best = new Map<number, typeof attempts[0]>();
    for (const a of attempts) {
      const prev = best.get(a.userId);
      if (!prev || a.score > prev.score) best.set(a.userId, a);
    }
    const sorted = Array.from(best.values()).sort((a, b) => b.score - a.score);
    const leaderboard = await Promise.all(sorted.slice(0, 10).map(async (a, i) => {
      const [user] = await db.select({ name: usersTable.name, avatarUrl: usersTable.avatarUrl }).from(usersTable).where(eq(usersTable.id, a.userId)).limit(1);
      return { rank: i + 1, userId: a.userId, userName: user?.name ?? "Unknown", userAvatar: user?.avatarUrl ?? null, score: a.score, completedAt: a.createdAt.toISOString() };
    }));
    res.json(leaderboard);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
