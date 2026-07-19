import { pgTable, serial, text, integer, real, timestamp, json, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { coursesTable } from "./courses";
import { usersTable } from "./users";

export const questionTypeEnum = pgEnum("question_type", ["multiple_choice", "true_false", "fill_blank"]);

export const quizzesTable = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  lessonId: integer("lesson_id"),
  title: text("title").notNull(),
  description: text("description"),
  timeLimit: integer("time_limit"),
  passingScore: real("passing_score").notNull().default(70),
  isFinalExam: boolean("is_final_exam").notNull().default(false),
  shuffleQuestions: boolean("shuffle_questions").notNull().default(false),
  maxAttempts: integer("max_attempts").default(3),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => quizzesTable.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  type: questionTypeEnum("type").notNull().default("multiple_choice"),
  options: json("options").$type<{ id: string; text: string; isCorrect: boolean }[]>().default([]),
  correctAnswer: text("correct_answer"),
  explanation: text("explanation"),
  imageUrl: text("image_url"),
  position: integer("position").notNull().default(0),
  points: integer("points").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const quizAttemptsTable = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => quizzesTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  score: real("score").notNull(),
  passed: boolean("passed").notNull(),
  answers: json("answers").$type<{ questionId: number; answer: string; isCorrect: boolean; points: number }[]>().default([]),
  timeSpent: integer("time_spent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertQuizSchema = createInsertSchema(quizzesTable).omit({ id: true, createdAt: true });
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Quiz = typeof quizzesTable.$inferSelect;

export const insertQuestionSchema = createInsertSchema(questionsTable).omit({ id: true, createdAt: true });
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questionsTable.$inferSelect;
