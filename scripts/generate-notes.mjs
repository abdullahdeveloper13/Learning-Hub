import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import SimplePdf from "./pdf-gen.mjs";
import { notesContent } from "./notes-content.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mediaRoot = path.join(repoRoot, "media", "resources", "courses");

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

let total = 0;
for (const [courseSlug, lessons] of Object.entries(notesContent)) {
  const lessonsPerModule = 3;
  lessons.forEach((lesson, i) => {
    const lessonCount = i + 1;
    const mi = Math.floor(i / lessonsPerModule);
    const li = i % lessonsPerModule;
    const pdf = new SimplePdf({ title: "SkillForge AI Lecture Notes" });

    pdf.heading(lesson.title, 17);
    pdf.paragraph(`Module ${mi + 1} - Lesson ${li + 1}`, 10);
    pdf.spacer(6);

    pdf.heading("Overview", 13);
    pdf.paragraph(lesson.overview);
    pdf.spacer(4);

    pdf.heading("Key Concepts", 13);
    for (const concept of lesson.concepts) {
      pdf.bullet(concept);
    }
    pdf.spacer(4);

    if (lesson.example) {
      pdf.heading("Example", 13);
      pdf.codeBlock(lesson.example);
      pdf.spacer(4);
    }

    pdf.heading("Summary", 13);
    pdf.paragraph(lesson.summary);
    pdf.spacer(4);

    pdf.heading("Practice Checklist", 13);
    for (const item of lesson.practice) {
      pdf.bullet(item);
    }

    const courseDir = path.join(mediaRoot, courseSlug);
    fs.mkdirSync(courseDir, { recursive: true });
    const filePath = path.join(courseDir, `lesson-${lessonCount}-notes.pdf`);
    fs.writeFileSync(filePath, pdf.build());
    total += 1;
  });
}

console.log(`Generated ${total} lecture note PDFs under "${mediaRoot}"`);