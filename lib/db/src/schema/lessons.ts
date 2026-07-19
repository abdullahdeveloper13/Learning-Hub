import { pgTable, serial, text, integer, boolean, timestamp, pgEnum, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { modulesTable } from "./modules";

export const lessonTypeEnum = pgEnum("lesson_type", ["video", "text", "quiz", "assignment", "resource", "exam"]);

export const lessonsTable = pgTable("lessons", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => modulesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: lessonTypeEnum("type").notNull().default("video"),
  content: text("content"),
  videoUrl: text("video_url"),
  pdfUrl: text("pdf_url"),
  resourceUrl: text("resource_url"),
  downloadableFiles: json("downloadable_files").$type<{ name: string; url: string; size?: number }[]>().default([]),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration"),
  position: integer("position").notNull().default(0),
  isFree: boolean("is_free").notNull().default(false),
  isExam: boolean("is_exam").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLessonSchema = createInsertSchema(lessonsTable).omit({ id: true, createdAt: true });
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessonsTable.$inferSelect;
