import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

loadEnv(path.resolve(process.cwd(), ".env"));

const apiPort = process.env.API_TEST_PORT || "3123";
const apiBase = process.env.API_TEST_BASE_URL || `http://127.0.0.1:${apiPort}/api`;
const supabaseUrl = requireEnv("SUPABASE_URL").replace(/\/$/, "");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const runId = `api-save-test-${Date.now()}`;
const inserted = [];
const results = [];
let serverProcess = null;

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
    ) value = value.slice(1, -1);
    process.env[key] = value;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set in .env`);
  return value;
}

async function rest(pathname, init = {}) {
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
  if (response.ok) return response.status === 204 ? null : response.json();
  throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
}

async function api(pathname, init = {}) {
  const response = await fetch(`${apiBase}${pathname}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (response.ok) return body;
  throw new Error(`${init.method || "GET"} ${pathname} failed: ${response.status} ${JSON.stringify(body)}`);
}

async function startServerIfRequested() {
  if (process.env.START_API_SERVER !== "1") return;

  serverProcess = spawn(process.execPath, ["artifacts/api-server/dist/index.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: apiPort },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout.on("data", (chunk) => process.stdout.write(`[api] ${chunk}`));
  serverProcess.stderr.on("data", (chunk) => process.stderr.write(`[api] ${chunk}`));

  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      await fetch(`${apiBase}/courses`, { signal: AbortSignal.timeout(1_000) });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error("Timed out waiting for temporary API server");
}

async function restInsert(table, values) {
  const rows = await rest(`/rest/v1/${table}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(values),
  });
  inserted.push({ table, id: rows[0].id });
  return rows[0];
}

async function expectRow(table, id, check = () => true) {
  try {
    const rows = await rest(`/rest/v1/${table}?id=eq.${id}&limit=1`);
    if (!rows[0] || !check(rows[0])) throw new Error("row missing or did not match expected data");
    results.push({ table, status: "ok", id });
  } catch (error) {
    results.push({ table, status: "failed", id, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

async function cleanup() {
  for (const { table, id } of inserted.toReversed()) {
    await rest(`/rest/v1/${table}?id=eq.${id}`, { method: "DELETE" }).catch(() => {});
  }
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

async function main() {
  try {
    await startServerIfRequested();

    const category = await restInsert("categories", {
      name: "API Save Test Category",
      slug: runId,
      description: runId,
    });

    const instructorAuth = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: `${runId}-instructor@example.test`,
        password: "Password123!",
        name: "API Save Test Instructor",
        role: "instructor",
      }),
    });
    inserted.push({ table: "users", id: instructorAuth.user.id });

    const studentAuth = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: `${runId}-student@example.test`,
        password: "Password123!",
        name: "API Save Test Student",
        role: "student",
      }),
    });
    inserted.push({ table: "users", id: studentAuth.user.id });

    const instructorHeaders = { Authorization: `Bearer ${instructorAuth.token}` };
    const studentHeaders = { Authorization: `Bearer ${studentAuth.token}` };

    const course = await api("/courses", {
      method: "POST",
      headers: instructorHeaders,
      body: JSON.stringify({
        title: "API Save Test Course",
        categoryId: category.id,
        level: "beginner",
        price: 0,
        faqs: [{ question: "API FAQ?", answer: runId }],
      }),
    });
    inserted.push({ table: "courses", id: course.id });
    await expectRow("courses", course.id, (row) => Array.isArray(row.faqs) && row.faqs[0]?.answer === runId);

    const module = await api(`/courses/${course.id}/modules`, {
      method: "POST",
      headers: instructorHeaders,
      body: JSON.stringify({ title: "API Save Test Module", description: runId, position: 0 }),
    });
    inserted.push({ table: "modules", id: module.id });
    await expectRow("modules", module.id, (row) => row.course_id === course.id);

    const lesson = await api(`/modules/${module.id}/lessons`, {
      method: "POST",
      headers: instructorHeaders,
      body: JSON.stringify({
        title: "API Save Test Lesson",
        type: "quiz",
        content: runId,
        duration: 7,
        position: 0,
        isFree: true,
      }),
    });
    inserted.push({ table: "lessons", id: lesson.id });
    await expectRow("lessons", lesson.id, (row) => row.module_id === module.id && row.content === runId);

    const quiz = await api(`/courses/${course.id}/quizzes`, {
      method: "POST",
      headers: instructorHeaders,
      body: JSON.stringify({
        title: "API Save Test Quiz",
        lessonId: lesson.id,
        questions: [{ text: "Works?", options: [{ id: "a", text: "Yes", isCorrect: true }], correctAnswer: "a" }],
      }),
    });
    inserted.push({ table: "quizzes", id: quiz.id });
    await expectRow("quizzes", quiz.id, (row) => row.course_id === course.id && row.lesson_id === lesson.id);
    const questions = await rest(`/rest/v1/questions?quiz_id=eq.${quiz.id}`);
    if (!questions.length) throw new Error("question row missing after quiz API save");
    inserted.push({ table: "questions", id: questions[0].id });
    results.push({ table: "questions", status: "ok", id: questions[0].id });

    const assignment = await api(`/courses/${course.id}/assignments`, {
      method: "POST",
      headers: instructorHeaders,
      body: JSON.stringify({
        title: "API Save Test Assignment",
        lessonId: lesson.id,
        instructions: runId,
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
    inserted.push({ table: "assignments", id: assignment.id });
    await expectRow("assignments", assignment.id, (row) => row.lesson_id === lesson.id && row.instructions === runId);

    const enrollment = await api("/enrollments", {
      method: "POST",
      headers: studentHeaders,
      body: JSON.stringify({ courseId: course.id }),
    });
    inserted.push({ table: "enrollments", id: enrollment.id });
    await expectRow("enrollments", enrollment.id, (row) => row.course_id === course.id);

    const progress = await api(`/progress/lessons/${lesson.id}/complete`, {
      method: "POST",
      headers: studentHeaders,
    });
    const progressRows = await rest(`/rest/v1/lesson_progress?user_id=eq.${progress.userId}&lesson_id=eq.${progress.lessonId}&limit=1`);
    if (!progressRows[0]) throw new Error("lesson_progress row missing after progress API save");
    inserted.push({ table: "lesson_progress", id: progressRows[0].id });
    results.push({ table: "lesson_progress", status: "ok", id: progressRows[0].id });

    const submission = await api(`/assignments/${assignment.id}/submit`, {
      method: "POST",
      headers: studentHeaders,
      body: JSON.stringify({ content: runId }),
    });
    inserted.push({ table: "assignment_submissions", id: submission.id });
    await expectRow("assignment_submissions", submission.id, (row) => row.assignment_id === assignment.id);

    const review = await api(`/courses/${course.id}/reviews`, {
      method: "POST",
      headers: studentHeaders,
      body: JSON.stringify({ rating: 5, comment: runId }),
    });
    inserted.push({ table: "reviews", id: review.id });
    await expectRow("reviews", review.id, (row) => row.course_id === course.id);
  } finally {
    await cleanup();
    console.table(results);
    const failed = results.filter((result) => result.status !== "ok");
    if (failed.length) {
      console.error(`Failed API save tests: ${failed.map((result) => result.table).join(", ")}`);
      process.exitCode = 1;
    } else {
      console.log("API save-path tests passed. Test rows were deleted.");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
