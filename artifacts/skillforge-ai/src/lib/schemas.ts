import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["student", "instructor"]).optional().default("student"),
});

export const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
});

export const courseSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  previewVideoUrl: z.string().url().optional().or(z.literal("")),
  categoryId: z.coerce.number().min(1, "Please select a category"),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  price: z.coerce.number().min(0, "Price must be >= 0"),
  discountPrice: z.coerce.number().optional(),
  tags: z.string().optional(), // We'll parse this to string array in the component
  requirements: z.string().optional(), // Newline separated
  outcomes: z.string().optional(), // Newline separated
});

export const moduleSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
});

export const lessonSchema = z.object({
  title: z.string().min(2, "Title is required"),
  type: z.enum(["video", "text", "quiz", "assignment", "resource"]),
  content: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal("")),
  resourceUrl: z.string().url().optional().or(z.literal("")),
  duration: z.coerce.number().optional(),
  isFree: z.boolean().default(false),
});
