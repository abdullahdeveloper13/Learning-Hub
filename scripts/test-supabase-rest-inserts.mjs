import fs from "node:fs";
import path from "node:path";

loadEnv(path.resolve(process.cwd(), ".env"));

const supabaseUrl = requireEnv("SUPABASE_URL").replace(/\/$/, "");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const runId = `rest-insert-test-${Date.now()}`;
const inserted = [];
const results = [];

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return;

  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsAt = line.indexOf("=");
    if (equalsAt === -1) continue;

    const key = line.slice(0, equalsAt).trim();
    let value = line.slice(equalsAt + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set in .env`);
  return value;
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

  let detail = "";
  try {
    detail = JSON.stringify(await response.json());
  } catch {
    detail = await response.text().catch(() => "");
  }
  throw new Error(`${response.status} ${response.statusText}: ${detail}`);
}

async function insertOne(table, values) {
  try {
    const rows = await request(`/rest/v1/${table}`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(values),
    });
    const row = rows?.[0];
    if (!row?.id) throw new Error("Insert returned no id");
    await request(`/rest/v1/${table}?id=eq.${row.id}&limit=1`);
    inserted.push({ table, id: row.id });
    results.push({ table, status: "ok", id: row.id });
    return row;
  } catch (error) {
    results.push({
      table,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function cleanup() {
  for (const { table, id } of inserted.toReversed()) {
    try {
      await request(`/rest/v1/${table}?id=eq.${id}`, { method: "DELETE" });
    } catch (error) {
      console.error(`Cleanup failed for ${table}.${id}: ${error instanceof Error ? error.message : error}`);
    }
  }
}

async function main() {
  try {
    const instructor = await insertOne("users", {
      email: `${runId}-instructor@example.test`,
      name: "REST Insert Test Instructor",
      password_hash: "test-hash",
      role: "instructor",
      bio: runId,
      is_active: true,
    });

    const student = await insertOne("users", {
      email: `${runId}-student@example.test`,
      name: "REST Insert Test Student",
      password_hash: "test-hash",
      role: "student",
      bio: runId,
      is_active: true,
    });

    const category = await insertOne("categories", {
      name: "REST Insert Test Category",
      slug: runId,
      description: runId,
    });

    const course = await insertOne("courses", {
      title: "REST Insert Test Course",
      slug: runId,
      description: runId,
      short_description: runId,
      instructor_id: instructor.id,
      category_id: category.id,
      level: "beginner",
      is_published: false,
      price: 0,
      tags: ["diagnostic"],
      requirements: ["requirement"],
      outcomes: ["outcome"],
      prerequisites: ["prerequisite"],
      faqs: [{ question: "Can FAQs save?", answer: "Yes, this verifies the Supabase REST JSON insert." }],
      has_certificate: true,
    });

    const module = await insertOne("modules", {
      course_id: course.id,
      title: "REST Insert Test Module",
      description: runId,
      position: 0,
    });

    const lesson = await insertOne("lessons", {
      module_id: module.id,
      title: "REST Insert Test Lesson",
      type: "video",
      content: runId,
      video_url: "https://example.test/video.mp4",
      pdf_url: "https://example.test/notes.pdf",
      resource_url: "https://example.test/resource",
      downloadable_files: [{ name: "test.txt", url: "https://example.test/test.txt", size: 12 }],
      thumbnail_url: "https://example.test/thumb.png",
      duration: 5,
      position: 0,
      is_free: true,
      is_exam: false,
    });

    await insertOne("enrollments", { user_id: student.id, course_id: course.id });
    await insertOne("course_progress", {
      user_id: student.id,
      course_id: course.id,
      progress_percent: 25,
      last_lesson_id: lesson.id,
    });
    await insertOne("lesson_progress", { user_id: student.id, lesson_id: lesson.id });

    const quiz = await insertOne("quizzes", {
      course_id: course.id,
      lesson_id: lesson.id,
      title: "REST Insert Test Quiz",
      description: runId,
      time_limit: 10,
      passing_score: 70,
      is_final_exam: false,
      shuffle_questions: false,
      max_attempts: 3,
    });

    const question = await insertOne("questions", {
      quiz_id: quiz.id,
      text: "REST insert test question?",
      type: "multiple_choice",
      options: [{ id: "a", text: "Yes", isCorrect: true }],
      correct_answer: "a",
      explanation: runId,
      position: 0,
      points: 1,
    });

    await insertOne("quiz_attempts", {
      quiz_id: quiz.id,
      user_id: student.id,
      score: 100,
      passed: true,
      answers: [{ questionId: question.id, answer: "a", isCorrect: true, points: 1 }],
      time_spent: 30,
    });

    const assignment = await insertOne("assignments", {
      course_id: course.id,
      lesson_id: lesson.id,
      title: "REST Insert Test Assignment",
      description: runId,
      instructions: runId,
      rubric: [{ criterion: "Completeness", points: 100, description: "Test rubric" }],
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      max_score: 100,
      submission_type: "text",
      allowed_file_types: ["txt"],
      is_final_exam: false,
    });

    await insertOne("assignment_submissions", {
      assignment_id: assignment.id,
      user_id: student.id,
      content: runId,
      grade: 100,
      feedback: runId,
    });

    await insertOne("reviews", {
      course_id: course.id,
      user_id: student.id,
      rating: 5,
      comment: runId,
      instructor_reply: runId,
    });

    await insertOne("certificates", {
      user_id: student.id,
      course_id: course.id,
      credential_id: runId,
    });

    await insertOne("notifications", {
      user_id: student.id,
      type: "message",
      title: "REST Insert Test Notification",
      body: runId,
      link: "/insert-test",
      is_read: false,
    });

    const conversation = await insertOne("conversations", {});

    await insertOne("conversation_participants", {
      conversation_id: conversation.id,
      user_id: student.id,
    });

    await insertOne("messages", {
      conversation_id: conversation.id,
      sender_id: instructor.id,
      content: runId,
    });

    await insertOne("discussions", {
      course_id: course.id,
      user_id: student.id,
      content: runId,
    });

    await insertOne("announcements", {
      title: "REST Insert Test Announcement",
      body: runId,
      target_role: "student",
      created_by: instructor.id,
    });

    await insertOne("activity_logs", {
      user_id: instructor.id,
      action: "insert_test",
      entity_type: "course",
      entity_id: course.id,
      details: runId,
    });
  } finally {
    await cleanup();
    console.table(results);
    const failed = results.filter((result) => result.status !== "ok");
    if (failed.length) {
      console.error(`Failed insert tests: ${failed.map((result) => result.table).join(", ")}`);
      process.exitCode = 1;
    } else {
      console.log("All Supabase REST insert tests passed. Test rows were deleted.");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
