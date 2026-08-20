import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { categories, courses, instructors, students } from "./seed-skillforge-content.mjs";
import { lessonVideos } from "../../../scripts/notes-content.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

loadEnv(path.resolve(scriptDir, "../../../.env"));
loadEnv(path.resolve(process.cwd(), ".env"));

const supabaseUrl = requireSupabaseUrl().replace(/\/$/, "");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const passwordHash = "$2b$10$V2IL71uBmllpPIdUE8xfseRKBUkLlDZHo5JIhe0RQR0AkV5uIuUKa";

async function main() {
  const categoryIds = new Map();
  for (const [name, slug, description, iconUrl] of categories) {
    const row = await upsertOne("categories", "slug", { name, slug, description, icon_url: iconUrl });
    categoryIds.set(slug, row.id);
  }

  const userIds = new Map();
  for (const instructor of instructors) {
    const row = await upsertOne("users", "email", {
      email: instructor.email,
      name: instructor.name,
      password_hash: passwordHash,
      role: "instructor",
      avatar_url: instructor.avatarUrl,
      bio: instructor.bio,
      is_active: true,
      updated_at: new Date().toISOString(),
    });
    userIds.set(instructor.email, row.id);
  }

  for (const [email, name, avatarUrl] of students) {
    const row = await upsertOne("users", "email", {
      email,
      name,
      password_hash: passwordHash,
      role: "student",
      avatar_url: avatarUrl,
      is_active: true,
      updated_at: new Date().toISOString(),
    });
    userIds.set(email, row.id);
  }

  for (const course of courses) {
    const courseRow = await upsertOne("courses", "slug", {
      title: course.title,
      slug: course.slug,
      description: course.description,
      short_description: course.shortDescription,
      thumbnail_url: course.thumbnailUrl,
      banner_url: course.bannerUrl,
      instructor_id: userIds.get(course.instructorEmail),
      category_id: categoryIds.get(course.categorySlug),
      level: course.level,
      is_published: true,
      price: course.price,
      tags: course.tags,
      requirements: course.requirements,
      outcomes: course.outcomes,
      prerequisites: course.prerequisites,
      faqs: [
        { question: "Do I get lifetime access?", answer: "Yes. Enrollment gives you full lifetime access to lessons, resources, quizzes, and assignments." },
        { question: "Is there a certificate?", answer: "Yes. A certificate can be issued when course completion requirements are met." },
      ],
      has_certificate: true,
      updated_at: new Date().toISOString(),
    });

    let lessonCount = 0;
    for (const [moduleIndex, [moduleTitle, lessonTitles]] of course.modules.entries()) {
      const moduleRow = await findOrCreateBy("modules", { course_id: courseRow.id, title: moduleTitle }, {
        course_id: courseRow.id,
        title: moduleTitle,
        description: `Practical lessons for ${moduleTitle.toLowerCase()}.`,
        position: moduleIndex + 1,
      });

      for (const [lessonIndex, lessonTitle] of lessonTitles.entries()) {
        lessonCount += 1;
        await findOrCreateBy("lessons", { module_id: moduleRow.id, title: lessonTitle }, {
          module_id: moduleRow.id,
          title: lessonTitle,
          type: "video",
          content: `${lessonTitle} covers concepts, guided practice, and a short production-focused checklist.`,
          video_url: `https://www.youtube.com/embed/${lessonVideos[course.slug][lessonCount - 1]}`,
          resource_url: `/resources/courses/${course.slug}/lesson-${lessonCount}`,
          downloadable_files: [
            { name: `${lessonTitle} notes`, url: `/resources/courses/${course.slug}/lesson-${lessonCount}-notes.pdf`, size: 240000 },
            { name: `${lessonTitle} starter files`, url: `/resources/courses/${course.slug}/lesson-${lessonCount}-starter.zip`, size: 780000 },
          ],
          thumbnail_url: course.thumbnailUrl,
          duration: 18 + ((lessonCount % 4) * 7),
          position: lessonIndex + 1,
          is_free: moduleIndex === 0 && lessonIndex === 0,
        });
      }
    }

    const quizRow = await findOrCreateBy("quizzes", { course_id: courseRow.id, title: course.quiz }, {
      course_id: courseRow.id,
      title: course.quiz,
      description: `Checks understanding of the core concepts in ${course.title}.`,
      time_limit: 25,
      passing_score: 70,
      shuffle_questions: true,
      max_attempts: 3,
    });

    const questionSet = [
      ["Which practice best supports maintainable learning projects?", ["Skipping validation", "Small tested iterations", "Hardcoding all data", "Ignoring feedback"], "Small tested iterations"],
      ["True or false: Production systems should validate input on the server.", ["True", "False"], "True"],
      ["Fill in the blank: Progress should be stored in the ____ rather than only in local UI state.", [], "database"],
    ];
    for (const [index, [text, options, correctAnswer]] of questionSet.entries()) {
      await findOrCreateBy("questions", { quiz_id: quizRow.id, text }, {
        quiz_id: quizRow.id,
        text,
        type: options.length === 2 ? "true_false" : options.length === 0 ? "fill_blank" : "multiple_choice",
        options: options.map((option, optionIndex) => ({ id: String.fromCharCode(97 + optionIndex), text: option, isCorrect: option === correctAnswer })),
        correct_answer: correctAnswer,
        explanation: "The correct answer reflects production LMS behavior: data and authorization belong on the server/database path.",
        position: index + 1,
        points: 1,
      });
    }

    await findOrCreateBy("assignments", { course_id: courseRow.id, title: course.assignment }, {
      course_id: courseRow.id,
      title: course.assignment,
      description: `Capstone assignment for ${course.title}.`,
      instructions: "Submit a concise project brief, source files or repository link, screenshots, and a reflection describing design decisions and tradeoffs.",
      rubric: [
        { criterion: "Correctness", points: 40, description: "Meets the stated requirements and runs reliably." },
        { criterion: "Code quality", points: 30, description: "Clear structure, naming, and maintainability." },
        { criterion: "Documentation", points: 20, description: "Includes setup notes and implementation rationale." },
        { criterion: "Presentation", points: 10, description: "Includes polished screenshots or demo evidence." },
      ],
      due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      max_score: 100,
      submission_type: "file",
      allowed_file_types: [".pdf", ".zip", ".md", ".txt"],
    });

    for (const [index, [email]] of students.entries()) {
      const studentId = userIds.get(email);
      await upsertOne("enrollments", "user_id,course_id", { user_id: studentId, course_id: courseRow.id });
      await upsertOne("reviews", "user_id,course_id", {
        course_id: courseRow.id,
        user_id: studentId,
        rating: course.ratingTarget[index % course.ratingTarget.length],
        comment: `Clear lessons, practical resources, and useful projects for ${course.title}.`,
      });
    }
  }

  const seeded = await selectMany("courses", { slug: `in.(${courses.map((course) => course.slug).join(",")})` });
  console.log(`Seeded via Supabase REST: ${seeded.length} primary courses.`);
}

async function findOrCreateBy(table, filters, values) {
  const existing = await selectMany(table, Object.fromEntries(Object.entries(filters).map(([key, value]) => [key, `eq.${value}`])));
  if (existing[0]) {
    return await updateOne(table, { id: `eq.${existing[0].id}` }, values);
  }
  return await insertOne(table, values);
}

async function selectMany(table, filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) params.set(key, String(value));
  const query = params.toString();
  return await request(`/rest/v1/${table}${query ? `?${query}` : ""}`);
}

async function insertOne(table, values) {
  const rows = await request(`/rest/v1/${table}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(values),
  });
  return rows[0];
}

async function updateOne(table, filters, values) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) params.set(key, String(value));
  const rows = await request(`/rest/v1/${table}?${params.toString()}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(values),
  });
  return rows[0];
}

async function upsertOne(table, conflict, values) {
  const rows = await request(`/rest/v1/${table}?on_conflict=${encodeURIComponent(conflict)}`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(values),
  });
  return rows[0];
}

async function request(pathname, init = {}) {
  const response = await fetch(`${supabaseUrl}${pathname}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (response.ok) {
    if (response.status === 204) return null;
    return response.json();
  }
  const detail = await response.text().catch(() => "");
  throw new Error(`${response.status} ${response.statusText}: ${detail}`);
}

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return;
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsAt = line.indexOf("=");
    if (equalsAt === -1) continue;
    const key = line.slice(0, equalsAt).trim();
    let value = line.slice(equalsAt + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] ??= value;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

function requireSupabaseUrl() {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL;
  if (process.env.DATABASE_URL?.startsWith("https://")) return process.env.DATABASE_URL;
  throw new Error("SUPABASE_URL must be set, or DATABASE_URL must be a Supabase HTTPS project URL for REST seeding");
}

await main();
