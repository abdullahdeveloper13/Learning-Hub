import { pgTable, serial, text, integer, timestamp, pgEnum, real, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { coursesTable } from "./courses";
import { usersTable } from "./users";

export const submissionTypeEnum = pgEnum("submission_type", ["text", "file", "link"]);

export const assignmentsTable = pgTable("assignments", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  lessonId: integer("lesson_id"),
  title: text("title").notNull(),
  description: text("description"),
  instructions: text("instructions"),
  rubric: json("rubric").$type<{ criterion: string; points: number; description: string }[]>().default([]),
  dueDate: timestamp("due_date").notNull(),
  maxScore: integer("max_score").notNull().default(100),
  submissionType: submissionTypeEnum("submission_type").notNull().default("text"),
  allowedFileTypes: json("allowed_file_types").$type<string[]>().default([]),
  isFinalExam: boolean("is_final_exam").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const assignmentSubmissionsTable = pgTable("assignment_submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull().references(() => assignmentsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  content: text("content").notNull(),
  fileUrl: text("file_url"),
  linkUrl: text("link_url"),
  grade: integer("grade"),
  feedback: text("feedback"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  gradedAt: timestamp("graded_at"),
});

export const insertAssignmentSchema = createInsertSchema(assignmentsTable).omit({ id: true, createdAt: true });
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignmentsTable.$inferSelect;
