import { pgTable, serial, text, boolean, timestamp, integer, real, pgEnum, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { categoriesTable } from "./categories";

export const courseLevelEnum = pgEnum("course_level", ["beginner", "intermediate", "advanced"]);

export const coursesTable = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  shortDescription: text("short_description"),
  thumbnailUrl: text("thumbnail_url"),
  bannerUrl: text("banner_url"),
  previewVideoUrl: text("preview_video_url"),
  instructorId: integer("instructor_id").notNull().references(() => usersTable.id),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id),
  level: courseLevelEnum("level").notNull().default("beginner"),
  isPublished: boolean("is_published").notNull().default(false),
  price: real("price").notNull().default(0),
  discountPrice: real("discount_price"),
  tags: json("tags").$type<string[]>().default([]),
  requirements: json("requirements").$type<string[]>().default([]),
  outcomes: json("outcomes").$type<string[]>().default([]),
  prerequisites: json("prerequisites").$type<string[]>().default([]),
  faqs: json("faqs").$type<{ question: string; answer: string }[]>().default([]),
  hasCertificate: boolean("has_certificate").notNull().default(true),
  certificateTemplate: text("certificate_template"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCourseSchema = createInsertSchema(coursesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof coursesTable.$inferSelect;
