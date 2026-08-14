import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

loadEnv(path.resolve(import.meta.dirname, "../../../.env"));
loadEnv(path.resolve(process.cwd(), ".env"));

const { Pool } = pg;

const passwordHash = "$2b$10$V2IL71uBmllpPIdUE8xfseRKBUkLlDZHo5JIhe0RQR0AkV5uIuUKa";

export const categories = [
  ["Web Development", "web-development", "Frontend, backend, and full-stack engineering.", "/images/categories/web-development.jpg"],
  ["Programming", "programming", "Programming languages, software craft, automation, and testing.", "/images/categories/programming.jpg"],
  ["Artificial Intelligence", "artificial-intelligence", "Machine learning, generative AI, and applied AI systems.", "/images/categories/ai.jpg"],
  ["Design", "design", "UX, UI, product design, and visual systems.", "/images/categories/design.jpg"],
  ["Business", "business", "Strategy, operations, growth, finance, and leadership.", "/images/categories/business.jpg"],
];

export const instructors = [
  {
    email: "sarah.mitchell@skillforge.local",
    name: "Sarah Mitchell",
    avatarUrl: "/images/instructors/instructor-1.jpg",
    bio: "Senior full-stack developer with 12 years of experience shipping React, Next.js, and cloud-native products.",
  },
  {
    email: "daniel.carter@skillforge.local",
    name: "Daniel Carter",
    avatarUrl: "/images/instructors/instructor-2.jpg",
    bio: "Python and software engineering instructor focused on practical automation, APIs, testing, and maintainable code.",
  },
  {
    email: "emily.rodriguez@skillforge.local",
    name: "Emily Rodriguez",
    avatarUrl: "/images/instructors/instructor-3.jpg",
    bio: "AI and machine learning educator who helps learners turn data science foundations into deployable model workflows.",
  },
];

export const students = [
  ["maya.patel@skillforge.local", "Maya Patel", "/images/avatars/default-avatar.jpg"],
  ["noah.brooks@skillforge.local", "Noah Brooks", "/images/avatars/default-avatar.jpg"],
  ["amina.khan@skillforge.local", "Amina Khan", "/images/avatars/default-avatar.jpg"],
  ["liam.chen@skillforge.local", "Liam Chen", "/images/avatars/default-avatar.jpg"],
  ["olivia.rivera@skillforge.local", "Olivia Rivera", "/images/avatars/default-avatar.jpg"],
];

export const courses = [
  {
    title: "Complete Web Development Bootcamp",
    slug: "complete-web-development-bootcamp",
    description: "A practical full-stack web development course covering HTML, CSS, JavaScript, React, Next.js, APIs, databases, authentication, deployment, and modern web development practices.",
    shortDescription: "Build production-grade full-stack web apps from foundations through deployment.",
    categorySlug: "web-development",
    instructorEmail: "sarah.mitchell@skillforge.local",
    level: "advanced",
    price: 79,
    ratingTarget: [5, 5, 5, 4, 5],
    thumbnailUrl: "/images/courses/web-development.jpg",
    bannerUrl: "/images/courses/web-development.jpg",
    tags: ["HTML", "CSS", "JavaScript", "React", "Next.js", "PostgreSQL"],
    requirements: ["A computer with a modern browser", "Basic typing and file management skills", "No professional coding experience required"],
    prerequisites: ["Beginner-friendly", "Curiosity about building real web products"],
    outcomes: [
      "Build responsive interfaces with semantic HTML and modern CSS",
      "Write JavaScript for interactive product workflows",
      "Create React components and manage application state",
      "Build full-stack Next.js features with APIs and databases",
      "Implement authentication, protected routes, and deployment workflows",
    ],
    modules: [
      ["HTML & CSS Foundations", ["Semantic page structure", "Responsive layouts with Flexbox and Grid", "Accessible forms and navigation"]],
      ["JavaScript Fundamentals", ["Variables, functions, and control flow", "DOM events and browser APIs", "Async JavaScript and fetch"]],
      ["React Development", ["Components, props, and state", "Forms, validation, and effects", "Reusable UI patterns"]],
      ["Next.js Full Stack Development", ["Routing and server rendering", "API handlers and mutations", "Data fetching patterns"]],
      ["Databases & Authentication", ["Relational data modeling", "User registration and sessions", "Authorization and RBAC"]],
      ["Deployment & Production", ["Environment variables and secrets", "Build optimization", "Production monitoring checklist"]],
    ],
    quiz: "Full-Stack Web Foundations Quiz",
    assignment: "Build a responsive course landing page",
  },
  {
    title: "Python Programming from Beginner to Advanced",
    slug: "python-programming-beginner-to-advanced",
    description: "Learn Python from the fundamentals through object-oriented programming, APIs, databases, automation, testing, and practical projects.",
    shortDescription: "Learn Python fundamentals, automation, APIs, databases, and project structure.",
    categorySlug: "programming",
    instructorEmail: "daniel.carter@skillforge.local",
    level: "beginner",
    price: 59,
    ratingTarget: [5, 5, 4, 5, 4],
    thumbnailUrl: "/images/courses/python-programming.jpg",
    bannerUrl: "/images/courses/python-programming.jpg",
    tags: ["Python", "Automation", "APIs", "Testing", "Databases"],
    requirements: ["A computer that can run Python 3.12 or later", "Willingness to practice with small coding exercises"],
    prerequisites: ["No previous programming experience required"],
    outcomes: [
      "Write clean Python scripts using core language features",
      "Use functions, modules, and data structures effectively",
      "Design object-oriented Python programs",
      "Work with files, APIs, and databases",
      "Test and debug practical Python projects",
    ],
    modules: [
      ["Python Fundamentals", ["Installing Python and running scripts", "Variables, types, and expressions", "Control flow and loops"]],
      ["Functions & Data Structures", ["Functions and scope", "Lists, dictionaries, sets, and tuples", "Comprehensions and iteration"]],
      ["Object-Oriented Programming", ["Classes and objects", "Composition and inheritance", "Error handling patterns"]],
      ["Files, APIs & Databases", ["Reading and writing files", "Calling REST APIs", "SQLite and PostgreSQL basics"]],
      ["Testing & Debugging", ["Unit tests with pytest", "Debugging strategies", "Packaging reusable code"]],
      ["Practical Python Projects", ["Automation script project", "API data dashboard", "Command-line app capstone"]],
    ],
    quiz: "Python Core Skills Quiz",
    assignment: "Create a Python automation toolkit",
  },
  {
    title: "AI & Machine Learning Masterclass",
    slug: "ai-machine-learning-masterclass",
    description: "Learn the foundations of artificial intelligence and machine learning, including Python-based data preparation, supervised learning, neural networks, model evaluation, and modern AI applications.",
    shortDescription: "Move from ML foundations to practical model training and evaluation.",
    categorySlug: "artificial-intelligence",
    instructorEmail: "emily.rodriguez@skillforge.local",
    level: "intermediate",
    price: 99,
    ratingTarget: [5, 5, 5, 5, 4],
    thumbnailUrl: "/images/courses/ai-machine-learning.jpg",
    bannerUrl: "/images/courses/ai-machine-learning.jpg",
    tags: ["AI", "Machine Learning", "Python", "Data Science", "Neural Networks"],
    requirements: ["Comfort with basic Python", "Basic algebra and curiosity about data", "A laptop capable of running notebooks"],
    prerequisites: ["Python basics", "Introductory statistics helpful but not required"],
    outcomes: [
      "Explain core AI and machine learning concepts",
      "Prepare datasets for model training",
      "Train supervised and unsupervised learning models",
      "Evaluate model quality and avoid common pitfalls",
      "Prototype practical AI applications responsibly",
    ],
    modules: [
      ["AI & Machine Learning Foundations", ["What AI systems can and cannot do", "ML project lifecycle", "Responsible AI basics"]],
      ["Python for Data Science", ["Notebook workflow", "Data cleaning with pandas", "Visualizing datasets"]],
      ["Supervised Learning", ["Regression models", "Classification models", "Feature engineering"]],
      ["Unsupervised Learning", ["Clustering concepts", "Dimensionality reduction", "Interpreting patterns"]],
      ["Neural Networks", ["Perceptrons and activation functions", "Training loops", "Overfitting and regularization"]],
      ["Practical AI Projects", ["Model evaluation report", "AI assistant prototype", "Deployment readiness checklist"]],
    ],
    quiz: "Machine Learning Foundations Quiz",
    assignment: "Train and evaluate a classification model",
  },
];

async function main() {
  const databaseUrl = requireEnv("DATABASE_URL");
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("supabase") || databaseUrl.includes("pooler.supabase.com")
      ? { rejectUnauthorized: false }
      : undefined,
  });
  const client = await pool.connect();
  try {
    await client.query("begin");

    const categoryIds = new Map();
    for (const [name, slug, description, iconUrl] of categories) {
      const { rows } = await client.query(
        `insert into categories (name, slug, description, icon_url)
         values ($1, $2, $3, $4)
         on conflict (slug) do update set
           name = excluded.name,
           description = excluded.description,
           icon_url = excluded.icon_url
         returning id`,
        [name, slug, description, iconUrl],
      );
      categoryIds.set(slug, rows[0].id);
    }

    const userIds = new Map();
    for (const instructor of instructors) {
      const { rows } = await client.query(
        `insert into users (email, name, password_hash, role, avatar_url, bio, is_active, updated_at)
         values ($1, $2, $3, 'instructor', $4, $5, true, now())
         on conflict (email) do update set
           name = excluded.name,
           role = 'instructor',
           avatar_url = excluded.avatar_url,
           bio = excluded.bio,
           is_active = true,
           updated_at = now()
         returning id`,
        [instructor.email, instructor.name, passwordHash, instructor.avatarUrl, instructor.bio],
      );
      userIds.set(instructor.email, rows[0].id);
    }

    for (const [email, name, avatarUrl] of students) {
      const { rows } = await client.query(
        `insert into users (email, name, password_hash, role, avatar_url, is_active, updated_at)
         values ($1, $2, $3, 'student', $4, true, now())
         on conflict (email) do update set
           name = excluded.name,
           avatar_url = excluded.avatar_url,
           is_active = true,
           updated_at = now()
         returning id`,
        [email, name, passwordHash, avatarUrl],
      );
      userIds.set(email, rows[0].id);
    }

    const courseIds = [];
    for (const course of courses) {
      const { rows } = await client.query(
        `insert into courses (
           title, slug, description, short_description, thumbnail_url, banner_url,
           instructor_id, category_id, level, is_published, price, tags,
           requirements, outcomes, prerequisites, faqs, has_certificate, updated_at
         )
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10,$11::json,$12::json,$13::json,$14::json,$15::json,true,now())
         on conflict (slug) do update set
           title = excluded.title,
           description = excluded.description,
           short_description = excluded.short_description,
           thumbnail_url = excluded.thumbnail_url,
           banner_url = excluded.banner_url,
           instructor_id = excluded.instructor_id,
           category_id = excluded.category_id,
           level = excluded.level,
           is_published = true,
           price = excluded.price,
           tags = excluded.tags,
           requirements = excluded.requirements,
           outcomes = excluded.outcomes,
           prerequisites = excluded.prerequisites,
           faqs = excluded.faqs,
           has_certificate = true,
           updated_at = now()
         returning id`,
        [
          course.title,
          course.slug,
          course.description,
          course.shortDescription,
          course.thumbnailUrl,
          course.bannerUrl,
          userIds.get(course.instructorEmail),
          categoryIds.get(course.categorySlug),
          course.level,
          course.price,
          JSON.stringify(course.tags),
          JSON.stringify(course.requirements),
          JSON.stringify(course.outcomes),
          JSON.stringify(course.prerequisites),
          JSON.stringify([
            { question: "Do I get lifetime access?", answer: "Yes. Enrollment gives you full lifetime access to lessons, resources, quizzes, and assignments." },
            { question: "Is there a certificate?", answer: "Yes. A certificate can be issued when course completion requirements are met." },
          ]),
        ],
      );
      const courseId = rows[0].id;
      courseIds.push(courseId);

      await client.query("delete from modules where course_id = $1", [courseId]);
      await client.query("delete from quizzes where course_id = $1", [courseId]);
      await client.query("delete from assignments where course_id = $1", [courseId]);

      let lessonCount = 0;
      for (const [moduleIndex, [moduleTitle, lessonTitles]] of course.modules.entries()) {
        const moduleRows = await client.query(
          `insert into modules (course_id, title, description, position)
           values ($1, $2, $3, $4)
           returning id`,
          [courseId, moduleTitle, `Practical lessons for ${moduleTitle.toLowerCase()}.`, moduleIndex + 1],
        );
        const moduleId = moduleRows.rows[0].id;

        for (const [lessonIndex, lessonTitle] of lessonTitles.entries()) {
          lessonCount += 1;
          await client.query(
            `insert into lessons (
               module_id, title, type, content, video_url, resource_url,
               downloadable_files, thumbnail_url, duration, position, is_free
             )
             values ($1,$2,'video',$3,$4,$5,$6::json,$7,$8,$9,$10)`,
            [
              moduleId,
              lessonTitle,
              `${lessonTitle} covers concepts, guided practice, and a short production-focused checklist.`,
              `/media/courses/${course.slug}/lesson-${lessonCount}.mp4`,
              `/resources/courses/${course.slug}/lesson-${lessonCount}`,
              JSON.stringify([
                { name: `${lessonTitle} notes`, url: `/resources/courses/${course.slug}/lesson-${lessonCount}-notes.pdf`, size: 240000 },
                { name: `${lessonTitle} starter files`, url: `/resources/courses/${course.slug}/lesson-${lessonCount}-starter.zip`, size: 780000 },
              ]),
              course.thumbnailUrl,
              18 + ((lessonCount % 4) * 7),
              lessonIndex + 1,
              moduleIndex === 0 && lessonIndex === 0,
            ],
          );
        }
      }

      const quizRows = await client.query(
        `insert into quizzes (course_id, title, description, time_limit, passing_score, shuffle_questions, max_attempts)
         values ($1, $2, $3, 25, 70, true, 3)
         returning id`,
        [courseId, course.quiz, `Checks understanding of the core concepts in ${course.title}.`],
      );
      const quizId = quizRows.rows[0].id;
      const questionSet = [
        ["Which practice best supports maintainable learning projects?", ["Skipping validation", "Small tested iterations", "Hardcoding all data", "Ignoring feedback"], "Small tested iterations"],
        ["True or false: Production systems should validate input on the server.", ["True", "False"], "True"],
        ["Fill in the blank: Progress should be stored in the ____ rather than only in local UI state.", [], "database"],
      ];
      for (const [index, [text, options, correctAnswer]] of questionSet.entries()) {
        const optionRows = options.map((option, optionIndex) => ({
          id: String.fromCharCode(97 + optionIndex),
          text: option,
          isCorrect: option === correctAnswer,
        }));
        await client.query(
          `insert into questions (quiz_id, text, type, options, correct_answer, explanation, position, points)
           values ($1,$2,$3,$4::json,$5,$6,$7,1)`,
          [
            quizId,
            text,
            options.length === 2 ? "true_false" : options.length === 0 ? "fill_blank" : "multiple_choice",
            JSON.stringify(optionRows),
            correctAnswer,
            "The correct answer reflects production LMS behavior: data and authorization belong on the server/database path.",
            index + 1,
          ],
        );
      }

      await client.query(
        `insert into assignments (
           course_id, title, description, instructions, rubric, due_date,
           max_score, submission_type, allowed_file_types
         )
         values ($1,$2,$3,$4,$5::json,now() + interval '21 days',100,'file',$6::json)`,
        [
          courseId,
          course.assignment,
          `Capstone assignment for ${course.title}.`,
          "Submit a concise project brief, source files or repository link, screenshots, and a reflection describing design decisions and tradeoffs.",
          JSON.stringify([
            { criterion: "Correctness", points: 40, description: "Meets the stated requirements and runs reliably." },
            { criterion: "Code quality", points: 30, description: "Clear structure, naming, and maintainability." },
            { criterion: "Documentation", points: 20, description: "Includes setup notes and implementation rationale." },
            { criterion: "Presentation", points: 10, description: "Includes polished screenshots or demo evidence." },
          ]),
          JSON.stringify([".pdf", ".zip", ".md", ".txt"]),
        ],
      );

      for (const [index, [email]] of students.entries()) {
        const studentId = userIds.get(email);
        await client.query(
          `insert into enrollments (user_id, course_id, enrolled_at)
           values ($1, $2, now() - ($3::int * interval '2 days'))
           on conflict (user_id, course_id) do nothing`,
          [studentId, courseId, index + 1],
        );
        await client.query(
          `insert into reviews (course_id, user_id, rating, comment)
           values ($1, $2, $3, $4)
           on conflict (user_id, course_id) do update set
             rating = excluded.rating,
             comment = excluded.comment`,
          [
            courseId,
            studentId,
            course.ratingTarget[index % course.ratingTarget.length],
            `Clear lessons, practical resources, and useful projects for ${course.title}.`,
          ],
        );
      }
    }

    await client.query("commit");
    console.log(`Seeded ${courses.length} courses, ${categories.length} categories, ${instructors.length} instructors, ${students.length} students.`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
