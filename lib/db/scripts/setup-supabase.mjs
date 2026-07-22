import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = requireEnv("SUPABASE_URL").replace(/\/$/, "");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "course-assets";

if (!databaseUrl) {
  throw new Error("DATABASE_URL or SUPABASE_DATABASE_URL must be set to the Supabase Postgres connection string.");
}

const pool = new Pool({ connectionString: databaseUrl });

const images = {
  ai: `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#0f766e"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><circle cx="1040" cy="170" r="140" fill="#facc15" opacity=".9"/><path d="M160 520c140-210 320-250 520-120s340 80 460-40v200H160z" fill="#ecfeff" opacity=".22"/><text x="90" y="180" font-family="Arial" font-size="76" font-weight="700" fill="#fff">Applied AI</text><text x="92" y="260" font-family="Arial" font-size="34" fill="#dbeafe">Build useful learning assistants</text></svg>`,
  frontend: `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#111827"/><rect x="86" y="86" width="1108" height="548" rx="26" fill="#f8fafc"/><rect x="126" y="132" width="500" height="50" rx="10" fill="#14b8a6"/><rect x="126" y="224" width="1028" height="320" rx="14" fill="#e2e8f0"/><rect x="166" y="266" width="280" height="230" rx="16" fill="#fb7185"/><rect x="486" y="266" width="280" height="230" rx="16" fill="#38bdf8"/><rect x="806" y="266" width="280" height="230" rx="16" fill="#a3e635"/><text x="126" y="610" font-family="Arial" font-size="48" font-weight="700" fill="#111827">Frontend Systems</text></svg>`,
  data: `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#312e81"/><g fill="none" stroke="#fef3c7" stroke-width="8" opacity=".85"><path d="M150 540c120-260 230-220 330-80s210 110 330-90 220-170 320-70"/><path d="M150 420h980M150 300h980M150 180h980"/></g><g fill="#22c55e"><circle cx="260" cy="420" r="24"/><circle cx="486" cy="462" r="24"/><circle cx="730" cy="330" r="24"/><circle cx="1028" cy="284" r="24"/></g><text x="90" y="110" font-family="Arial" font-size="62" font-weight="700" fill="#fff">Data Analytics</text></svg>`,
};

async function main() {
  await pool.query(await readFile(path.resolve(__dirname, "../supabase-schema.sql"), "utf8"));
  await ensureBucket();

  const media = {
    ai: await uploadText("seed/applied-ai.svg", images.ai, "image/svg+xml"),
    frontend: await uploadText("seed/frontend-systems.svg", images.frontend, "image/svg+xml"),
    data: await uploadText("seed/data-analytics.svg", images.data, "image/svg+xml"),
    pdf: await uploadText("seed/course-workbook.pdf", "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF", "application/pdf"),
    video: await uploadText("seed/sample-lesson.mp4", "SkillForge sample hosted video asset", "video/mp4"),
    file: await uploadText("seed/project-brief.txt", "Build the capstone project and submit your repository link.", "text/plain"),
  };

  await seed(media);
  const result = await pool.query("select id, title, thumbnail_url, is_published from courses order by id");
  console.log(JSON.stringify({ insertedCourses: result.rows }, null, 2));
}

async function ensureBucket() {
  const response = await storageFetch(`/storage/v1/bucket/${bucket}`, { method: "GET" });
  if (response.ok) return;

  const created = await storageFetch("/storage/v1/bucket", {
    method: "POST",
    body: JSON.stringify({ id: bucket, name: bucket, public: true, file_size_limit: 2147483648 }),
  });
  if (!created.ok && created.status !== 409) {
    throw new Error(`Failed to create bucket: ${await created.text()}`);
  }
}

async function uploadText(objectPath, body, contentType) {
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body,
  });
  if (!response.ok) throw new Error(`Failed to upload ${objectPath}: ${await response.text()}`);
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
}

function storageFetch(endpoint, init) {
  return fetch(`${supabaseUrl}${endpoint}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

async function seed(media) {
  const passwordHash = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8yqLJz1mYVEU9UMjEpQNEb1M9TWs8K";
  const admin = await one("insert into users(email,name,password_hash,role,bio,avatar_url) values($1,$2,$3,'admin',$4,$5) returning id", ["admin@skillforge.local", "Amina Admin", passwordHash, "Platform owner", media.ai]);
  const instructor = await one("insert into users(email,name,password_hash,role,bio,avatar_url) values($1,$2,$3,'instructor',$4,$5) returning id", ["instructor@skillforge.local", "Sara Khan", passwordHash, "Instructor focused on practical digital skills.", media.frontend]);
  const student = await one("insert into users(email,name,password_hash,role,bio,avatar_url) values($1,$2,$3,'student',$4,$5) returning id", ["student@skillforge.local", "Demo Student", passwordHash, "Learner account for QA.", media.data]);

  const development = await one("insert into categories(name,slug,description) values('Web Development','web-development','Frontend and full-stack engineering courses.') returning id");
  const ai = await one("insert into categories(name,slug,description) values('Artificial Intelligence','artificial-intelligence','Applied AI workflows and tools.') returning id");
  const analytics = await one("insert into categories(name,slug,description) values('Data Analytics','data-analytics','Dashboards, SQL, and decision-ready analysis.') returning id");

  await createCourse("Applied AI Course Builder Lab", "applied-ai-course-builder-lab", ai.id, "intermediate", 79, media.ai, ["ai", "prompting", "automation"], instructor.id, student.id, media);
  await createCourse("Production Frontend Systems", "production-frontend-systems", development.id, "advanced", 119, media.frontend, ["react", "typescript", "testing"], instructor.id, student.id, media);
  await createCourse("Data Analytics for Operators", "data-analytics-for-operators", analytics.id, "beginner", 49, media.data, ["sql", "dashboards", "metrics"], admin.id, student.id, media);
}

async function createCourse(title, slug, categoryId, level, price, imageUrl, tags, instructorId, studentId, media) {
  const saved = await one(
    `insert into courses(title,slug,description,short_description,thumbnail_url,banner_url,preview_video_url,instructor_id,category_id,level,is_published,price,tags,requirements,outcomes,prerequisites,faqs,has_certificate)
     values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,$12,$13,$14,$15,$16,true) returning id`,
    [
      title,
      slug,
      `${title} is a realistic sample course seeded into Supabase for production CMS testing.`,
      "A practical, project-led course with uploaded media, quizzes, assignments, and a certificate.",
      imageUrl,
      imageUrl,
      media.video,
      instructorId,
      categoryId,
      level,
      price,
      JSON.stringify(tags),
      JSON.stringify(["A laptop", "Reliable internet", "Basic computer literacy"]),
      JSON.stringify(["Plan the work", "Use uploaded learning assets", "Complete the quiz, assignment, and final exam"]),
      JSON.stringify(["No paid tools required"]),
      JSON.stringify([{ question: "Do I get lifetime access?", answer: "Yes. Enrolled students can access uploaded lessons and resources immediately." }]),
    ],
  );

  const mod = await one("insert into modules(course_id,title,description,position) values($1,'Getting Started','Core concepts and first project setup.',0) returning id", [saved.id]);
  const videoLesson = await one(
    `insert into lessons(module_id,title,type,content,video_url,thumbnail_url,duration,position,is_free,downloadable_files)
     values($1,'Welcome and course roadmap','video','Meet the course goals and prepare your workspace.',$2,$3,12,0,true,$4) returning id`,
    [mod.id, media.video, imageUrl, JSON.stringify([{ name: "Project brief", url: media.file }])],
  );
  await one(
    `insert into lessons(module_id,title,type,content,pdf_url,duration,position,downloadable_files)
     values($1,'Workbook and reference guide','resource','Download the workbook before starting the capstone.',$2,8,1,$3) returning id`,
    [mod.id, media.pdf, JSON.stringify([{ name: "Workbook", url: media.pdf }, { name: "Project brief", url: media.file }])],
  );
  const quizLesson = await one("insert into lessons(module_id,title,type,content,duration,position) values($1,'Checkpoint quiz','quiz','Test your understanding before moving on.',10,2) returning id", [mod.id]);
  const assignmentLesson = await one("insert into lessons(module_id,title,type,content,duration,position) values($1,'Capstone assignment','assignment','Submit a short project plan.',25,3) returning id", [mod.id]);
  const examLesson = await one("insert into lessons(module_id,title,type,content,duration,position,is_exam) values($1,'Final exam','exam','Complete the final exam to earn your certificate.',30,4,true) returning id", [mod.id]);

  const quiz = await one("insert into quizzes(course_id,lesson_id,title,description,time_limit,passing_score,is_final_exam) values($1,$2,'Checkpoint quiz','Short knowledge check.',10,70,false) returning id", [saved.id, quizLesson.id]);
  await pool.query(
    `insert into questions(quiz_id,text,type,options,correct_answer,explanation,position,points)
     values($1,'What unlocks student access after enrollment?','multiple_choice',$2,null,'Course detail fetches return saved modules and lessons from the database.',0,1)`,
    [quiz.id, JSON.stringify([{ id: "a", text: "Uploaded lessons saved in the database", isCorrect: true }, { id: "b", text: "Only static front-end content", isCorrect: false }])],
  );

  const exam = await one("insert into quizzes(course_id,lesson_id,title,description,time_limit,passing_score,is_final_exam) values($1,$2,'Final exam','Certificate qualifying exam.',30,80,true) returning id", [saved.id, examLesson.id]);
  await pool.query("insert into questions(quiz_id,text,type,correct_answer,explanation,position,points) values($1,'True or False: media files are stored in Supabase Storage, while only URLs are saved in Postgres.','true_false','True','The CMS persists media URLs only.',0,2)", [exam.id]);
  await pool.query(
    `insert into assignments(course_id,lesson_id,title,description,instructions,due_date,submission_type,allowed_file_types,rubric)
     values($1,$2,'Capstone assignment','Create a brief implementation plan.','Submit a short written plan or link to your project notes.',now() + interval '30 days','link',$3,$4)`,
    [saved.id, assignmentLesson.id, JSON.stringify(["pdf", "docx", "txt"]), JSON.stringify([{ criterion: "Completeness", points: 50, description: "Covers goals, timeline, and risks." }, { criterion: "Clarity", points: 50, description: "Easy to review." }])],
  );
  await pool.query("insert into enrollments(user_id,course_id) values($1,$2) on conflict do nothing", [studentId, saved.id]);
  await pool.query("insert into lesson_progress(user_id,lesson_id) values($1,$2) on conflict do nothing", [studentId, videoLesson.id]);
  await pool.query("insert into reviews(course_id,user_id,rating,comment) values($1,$2,5,'Clear, practical, and ready to use.')", [saved.id, studentId]);
  await pool.query("insert into certificates(user_id,course_id,credential_id) values($1,$2,$3) on conflict do nothing", [studentId, saved.id, `SF-${saved.id}-${studentId}`]);
  await pool.query("insert into notifications(user_id,type,title,body,link) values($1,'enrollment',$2,'Start learning now!',$3)", [studentId, `Enrolled in ${title}`, `/learn/${saved.id}`]);
}

async function one(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0];
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
