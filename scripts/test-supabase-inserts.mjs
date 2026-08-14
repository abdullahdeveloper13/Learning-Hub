import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const requireFromDbPackage = createRequire(path.resolve(process.cwd(), "lib/db/package.json"));
const pg = requireFromDbPackage("pg");
const { Pool } = pg;

loadEnv(path.resolve(process.cwd(), ".env"));

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set in .env");
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl:
    databaseUrl.includes("supabase") || databaseUrl.includes("pooler.supabase.com")
      ? { rejectUnauthorized: false }
      : undefined,
});

const runId = `insert-test-${Date.now()}`;
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

async function insertOne(client, table, sql, params) {
  try {
    const { rows } = await client.query(sql, params);
    const row = rows[0];
    if (!row?.id) throw new Error("Insert returned no id");
    await client.query(`select 1 from ${table} where id = $1`, [row.id]);
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

async function main() {
  const client = await pool.connect();
  try {
    await client.query("begin");

    const instructor = await insertOne(
      client,
      "users",
      "insert into users(email,name,password_hash,role,bio) values($1,$2,$3,'instructor',$4) returning id",
      [`${runId}-instructor@example.test`, "Insert Test Instructor", "test-hash", runId],
    );

    const student = await insertOne(
      client,
      "users",
      "insert into users(email,name,password_hash,role,bio) values($1,$2,$3,'student',$4) returning id",
      [`${runId}-student@example.test`, "Insert Test Student", "test-hash", runId],
    );

    const category = await insertOne(
      client,
      "categories",
      "insert into categories(name,slug,description) values($1,$2,$3) returning id",
      ["Insert Test Category", runId, runId],
    );

    const course = await insertOne(
      client,
      "courses",
      `insert into courses(
        title,slug,description,short_description,instructor_id,category_id,level,
        is_published,price,tags,requirements,outcomes,prerequisites,faqs,has_certificate
      ) values($1,$2,$3,$4,$5,$6,'beginner',false,0,$7,$8,$9,$10,$11,true) returning id`,
      [
        "Insert Test Course",
        runId,
        runId,
        runId,
        instructor.id,
        category.id,
        JSON.stringify(["diagnostic"]),
        JSON.stringify(["requirement"]),
        JSON.stringify(["outcome"]),
        JSON.stringify(["prerequisite"]),
        JSON.stringify([{ question: "Can FAQs save?", answer: "Yes, this insert test verifies the faqs JSON column." }]),
      ],
    );

    const module = await insertOne(
      client,
      "modules",
      "insert into modules(course_id,title,description,position) values($1,$2,$3,0) returning id",
      [course.id, "Insert Test Module", runId],
    );

    const lesson = await insertOne(
      client,
      "lessons",
      `insert into lessons(
        module_id,title,type,content,video_url,pdf_url,resource_url,downloadable_files,
        thumbnail_url,duration,position,is_free,is_exam
      ) values($1,$2,'video',$3,$4,$5,$6,$7,$8,5,0,true,false) returning id`,
      [
        module.id,
        "Insert Test Lesson",
        runId,
        "https://example.test/video.mp4",
        "https://example.test/notes.pdf",
        "https://example.test/resource",
        JSON.stringify([{ name: "test.txt", url: "https://example.test/test.txt", size: 12 }]),
        "https://example.test/thumb.png",
      ],
    );

    await insertOne(
      client,
      "enrollments",
      "insert into enrollments(user_id,course_id) values($1,$2) returning id",
      [student.id, course.id],
    );

    await insertOne(
      client,
      "course_progress",
      "insert into course_progress(user_id,course_id,progress_percent,last_lesson_id) values($1,$2,25,$3) returning id",
      [student.id, course.id, lesson.id],
    );

    await insertOne(
      client,
      "lesson_progress",
      "insert into lesson_progress(user_id,lesson_id) values($1,$2) returning id",
      [student.id, lesson.id],
    );

    const quiz = await insertOne(
      client,
      "quizzes",
      "insert into quizzes(course_id,lesson_id,title,description,time_limit,passing_score,is_final_exam,shuffle_questions,max_attempts) values($1,$2,$3,$4,10,70,false,false,3) returning id",
      [course.id, lesson.id, "Insert Test Quiz", runId],
    );

    const question = await insertOne(
      client,
      "questions",
      "insert into questions(quiz_id,text,type,options,correct_answer,explanation,position,points) values($1,$2,'multiple_choice',$3,'a',$4,0,1) returning id",
      [
        quiz.id,
        "Insert test question?",
        JSON.stringify([{ id: "a", text: "Yes", isCorrect: true }]),
        runId,
      ],
    );

    await insertOne(
      client,
      "quiz_attempts",
      "insert into quiz_attempts(quiz_id,user_id,score,passed,answers,time_spent) values($1,$2,100,true,$3,30) returning id",
      [quiz.id, student.id, JSON.stringify([{ questionId: question.id, answer: "a", isCorrect: true, points: 1 }])],
    );

    const assignment = await insertOne(
      client,
      "assignments",
      "insert into assignments(course_id,lesson_id,title,description,instructions,rubric,due_date,max_score,submission_type,allowed_file_types,is_final_exam) values($1,$2,$3,$4,$5,$6,now() + interval '7 days',100,'text',$7,false) returning id",
      [
        course.id,
        lesson.id,
        "Insert Test Assignment",
        runId,
        runId,
        JSON.stringify([{ criterion: "Completeness", points: 100, description: "Test rubric" }]),
        JSON.stringify(["txt"]),
      ],
    );

    await insertOne(
      client,
      "assignment_submissions",
      "insert into assignment_submissions(assignment_id,user_id,content,grade,feedback) values($1,$2,$3,100,$4) returning id",
      [assignment.id, student.id, runId, runId],
    );

    await insertOne(
      client,
      "reviews",
      "insert into reviews(course_id,user_id,rating,comment,instructor_reply) values($1,$2,5,$3,$4) returning id",
      [course.id, student.id, runId, runId],
    );

    await insertOne(
      client,
      "certificates",
      "insert into certificates(user_id,course_id,credential_id) values($1,$2,$3) returning id",
      [student.id, course.id, runId],
    );

    await insertOne(
      client,
      "notifications",
      "insert into notifications(user_id,type,title,body,link,is_read) values($1,'message',$2,$3,$4,false) returning id",
      [student.id, "Insert Test Notification", runId, "/insert-test"],
    );

    const conversation = await insertOne(
      client,
      "conversations",
      "insert into conversations default values returning id",
      [],
    );

    await insertOne(
      client,
      "conversation_participants",
      "insert into conversation_participants(conversation_id,user_id) values($1,$2) returning id",
      [conversation.id, student.id],
    );

    await insertOne(
      client,
      "messages",
      "insert into messages(conversation_id,sender_id,content) values($1,$2,$3) returning id",
      [conversation.id, instructor.id, runId],
    );

    await insertOne(
      client,
      "discussions",
      "insert into discussions(course_id,user_id,content) values($1,$2,$3) returning id",
      [course.id, student.id, runId],
    );

    await insertOne(
      client,
      "announcements",
      "insert into announcements(title,body,target_role,created_by) values($1,$2,'student',$3) returning id",
      ["Insert Test Announcement", runId, instructor.id],
    );

    await insertOne(
      client,
      "activity_logs",
      "insert into activity_logs(user_id,action,entity_type,entity_id,details) values($1,$2,'course',$3,$4) returning id",
      [instructor.id, "insert_test", course.id, runId],
    );

    await client.query("rollback");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
    console.table(results);
    const failed = results.filter((result) => result.status !== "ok");
    if (failed.length) {
      console.error(`Failed insert tests: ${failed.map((result) => result.table).join(", ")}`);
    } else {
      console.log("All insert tests passed. Transaction rolled back; no test rows were kept.");
    }
  }
}

main().catch(async (error) => {
  await pool.end().catch(() => {});
  console.error(error);
  process.exit(1);
});
