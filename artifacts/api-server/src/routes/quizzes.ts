import { Router } from "express";
import { db } from "@workspace/db";
import { quizzesTable, questionsTable, quizAttemptsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { databaseErrorResponse } from "../lib/httpErrors";
import { supabaseRest } from "../lib/supabaseRest";

const router = Router();

type GradableQuestion = {
  id: number;
  type: string;
  options?: { id: string; text: string; isCorrect: boolean }[] | null;
  correctAnswer?: string | null;
  points: number;
};

type SubmittedAnswer = { questionId: number; answer: string };

export function gradeQuizAttempt(questions: GradableQuestion[], answers: SubmittedAnswer[], passingScore: number) {
  let totalPoints = 0;
  let earnedPoints = 0;
  const answerResults = answers.map((answer) => {
    const question = questions.find((candidate) => candidate.id === answer.questionId);
    if (!question) return { questionId: answer.questionId, answer: answer.answer, isCorrect: false, points: 0 };

    totalPoints += question.points;
    const normalizedAnswer = answer.answer.trim().toLowerCase();
    const normalizedCorrect = question.correctAnswer?.trim().toLowerCase();
    const options = question.options || [];
    const isCorrect =
      normalizedAnswer === normalizedCorrect ||
      options.find((option) => option.id === answer.answer)?.isCorrect === true ||
      (question.type === "fill_blank" && normalizedAnswer === normalizedCorrect);

    if (isCorrect) earnedPoints += question.points;
    return { questionId: answer.questionId, answer: answer.answer, isCorrect: !!isCorrect, points: isCorrect ? question.points : 0 };
  });
  const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
  return { score, passed: score >= passingScore, totalPoints, earnedPoints, answers: answerResults, passingScore };
}

function quizFromRest(row: any) {
  return {
    id: row.id,
    courseId: row.course_id,
    lessonId: row.lesson_id,
    title: row.title,
    description: row.description,
    timeLimit: row.time_limit,
    passingScore: row.passing_score,
    isFinalExam: row.is_final_exam,
    shuffleQuestions: row.shuffle_questions,
    maxAttempts: row.max_attempts,
    createdAt: new Date(row.created_at),
  };
}

function questionFromRest(row: any) {
  return {
    id: row.id,
    quizId: row.quiz_id,
    text: row.text,
    type: row.type,
    options: row.options ?? [],
    correctAnswer: row.correct_answer,
    explanation: row.explanation,
    imageUrl: row.image_url,
    position: row.position,
    points: row.points,
    createdAt: new Date(row.created_at),
  };
}

function quizToRestValues(values: any, courseId?: number) {
  const restValues: Record<string, unknown> = {};
  if (courseId !== undefined) restValues["course_id"] = courseId;
  const mappings: Record<string, string> = {
    lessonId: "lesson_id",
    timeLimit: "time_limit",
    passingScore: "passing_score",
    isFinalExam: "is_final_exam",
    shuffleQuestions: "shuffle_questions",
    maxAttempts: "max_attempts",
  };
  for (const [key, value] of Object.entries(values)) restValues[mappings[key] ?? key] = value;
  return restValues;
}

function questionToRestValues(question: any, quizId: number, position: number) {
  return {
    quiz_id: quizId,
    text: question.text,
    type: question.type ?? "multiple_choice",
    options: question.options ?? [],
    correct_answer: question.correctAnswer ?? null,
    explanation: question.explanation ?? null,
    image_url: question.imageUrl ?? null,
    position: question.position ?? position,
    points: question.points ?? 1,
  };
}

router.get("/courses/:courseId/quizzes", async (req, res) => {
  try {
    const courseId = Number(req.params["courseId"]);
    const quizzes = await db.select().from(quizzesTable).where(eq(quizzesTable.courseId, courseId));
    const result = await Promise.all(quizzes.map(async q => {
      const [cnt] = await db.select({ count: sql<number>`count(*)::int` }).from(questionsTable).where(eq(questionsTable.quizId, q.id));
      return { ...q, questionCount: cnt?.count ?? 0, attempts: 0 };
    }));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const courseId = Number(req.params["courseId"]);
      const rows = await supabaseRest().selectMany("quizzes", { course_id: courseId });
      const result = await Promise.all(rows.map(async (row) => {
        const quiz = quizFromRest(row);
        const questions = await supabaseRest().selectMany("questions", { quiz_id: quiz.id });
        return { ...quiz, questionCount: questions.length, attempts: 0 };
      }));
      res.json(result);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/courses/:courseId/quizzes", requireAuth, async (req, res) => {
  try {
    const courseId = Number(req.params["courseId"]);
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
    if (databaseErrorResponse(err)) {
      const courseId = Number(req.params["courseId"]);
      const { title, description, timeLimit, passingScore = 70, lessonId, isFinalExam = false, shuffleQuestions = false, maxAttempts = 3, questions = [] } = req.body;
      const inserted = await supabaseRest().insertOne("quizzes", quizToRestValues({
        title, description, timeLimit, passingScore, lessonId, isFinalExam, shuffleQuestions, maxAttempts,
      }, courseId));
      const quiz = quizFromRest(inserted);
      for (const [index, question] of questions.entries()) {
        await supabaseRest().insertOne("questions", questionToRestValues(question, quiz.id, index));
      }
      res.status(201).json({ ...quiz, questionCount: questions.length, attempts: 0 });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/quizzes/:quizId", async (req, res) => {
  try {
    const quizId = Number(req.params["quizId"]);
    const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, quizId)).limit(1);
    if (!quiz) { res.status(404).json({ error: "Not found" }); return; }
    const questions = await db.select().from(questionsTable).where(eq(questionsTable.quizId, quizId));
    res.json({ ...quiz, questionCount: questions.length, attempts: 0, questions });
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const quizId = Number(req.params["quizId"]);
      const row = await supabaseRest().selectOne("quizzes", { id: quizId });
      if (!row) { res.status(404).json({ error: "Not found" }); return; }
      const quiz = quizFromRest(row);
      const questions = (await supabaseRest().selectMany("questions", { quiz_id: quizId })).map(questionFromRest);
      res.json({ ...quiz, questionCount: questions.length, attempts: 0, questions });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/quizzes/:quizId", requireAuth, async (req, res) => {
  try {
    const quizId = Number(req.params["quizId"]);
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
    if (databaseErrorResponse(err)) {
      const quizId = Number(req.params["quizId"]);
      const { questions, ...rest } = req.body;
      const updates: Record<string, unknown> = {};
      for (const f of ["title", "description", "timeLimit", "passingScore", "isFinalExam", "shuffleQuestions", "maxAttempts"]) {
        if (rest[f] !== undefined) updates[f] = rest[f];
      }
      const row = await supabaseRest().updateOne("quizzes", { id: quizId }, quizToRestValues(updates));
      if (!row) { res.status(404).json({ error: "Not found" }); return; }
      if (Array.isArray(questions)) {
        await supabaseRest().deleteMany("questions", { quiz_id: quizId });
        for (const [index, question] of questions.entries()) {
          await supabaseRest().insertOne("questions", questionToRestValues(question, quizId, index));
        }
      }
      const savedQuestions = (await supabaseRest().selectMany("questions", { quiz_id: quizId })).map(questionFromRest);
      res.json({ ...quizFromRest(row), questionCount: savedQuestions.length, questions: savedQuestions });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/quizzes/:quizId", requireAuth, async (req, res) => {
  try {
    const quizId = Number(req.params["quizId"]);
    await db.delete(quizzesTable).where(eq(quizzesTable.id, quizId));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const quizId = Number(req.params["quizId"]);
      await supabaseRest().deleteOne("quizzes", { id: quizId });
      res.status(204).send();
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/quizzes/:quizId/submit", requireAuth, async (req, res) => {
  try {
    const quizId = Number(req.params["quizId"]);
    const { answers } = req.body as { answers: { questionId: number; answer: string }[] };
    const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, quizId)).limit(1);
    if (!quiz) { res.status(404).json({ error: "Not found" }); return; }
    const questions = await db.select().from(questionsTable).where(eq(questionsTable.quizId, quizId));
    const result = gradeQuizAttempt(questions, answers, quiz.passingScore);
    await db.insert(quizAttemptsTable).values({ quizId, userId: req.user!.id, score: result.score, passed: result.passed, answers: result.answers });
    res.json(result);
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const quizId = Number(req.params["quizId"]);
      const { answers } = req.body as { answers: { questionId: number; answer: string }[] };
      const row = await supabaseRest().selectOne("quizzes", { id: quizId });
      if (!row) { res.status(404).json({ error: "Not found" }); return; }
      const quiz = quizFromRest(row);
      const questions = (await supabaseRest().selectMany("questions", { quiz_id: quizId })).map(questionFromRest);
      const result = gradeQuizAttempt(questions, answers, quiz.passingScore);
      await supabaseRest().insertOne("quiz_attempts", {
        quiz_id: quizId,
        user_id: req.user!.id,
        score: result.score,
        passed: result.passed,
        answers: result.answers,
      });
      res.json(result);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/quizzes/:quizId/attempts", requireAuth, async (req, res) => {
  try {
    const quizId = Number(req.params["quizId"]);
    const attempts = await db.select().from(quizAttemptsTable).where(eq(quizAttemptsTable.quizId, quizId));
    res.json(attempts);
  } catch (err) {
    req.log.error(err);
    if (databaseErrorResponse(err)) {
      const quizId = Number(req.params["quizId"]);
      res.json(await supabaseRest().selectMany("quiz_attempts", { quiz_id: quizId }));
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/quizzes/:quizId/leaderboard", async (req, res) => {
  try {
    const quizId = Number(req.params["quizId"]);
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
