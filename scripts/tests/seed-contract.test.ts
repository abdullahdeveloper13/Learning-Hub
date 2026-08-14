import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { categories, courses, instructors, students } from "../../lib/db/scripts/seed-skillforge-content.mjs";

const requiredCourses = [
  ["Complete Web Development Bootcamp", "complete-web-development-bootcamp", "/images/courses/web-development.jpg"],
  ["Python Programming from Beginner to Advanced", "python-programming-beginner-to-advanced", "/images/courses/python-programming.jpg"],
  ["AI & Machine Learning Masterclass", "ai-machine-learning-masterclass", "/images/courses/ai-machine-learning.jpg"],
] as const;

test("SkillForge seed defines exactly the three primary published courses", () => {
  assert.equal(courses.length, 3);
  assert.equal(new Set(courses.map((course) => course.slug)).size, 3);
  for (const [title, slug, thumbnailUrl] of requiredCourses) {
    const course = courses.find((candidate) => candidate.slug === slug);
    assert.ok(course, `${title} is missing`);
    assert.equal(course.title, title);
    assert.equal(course.thumbnailUrl, thumbnailUrl);
    assert.equal(course.modules.length, 6);
    assert.equal(course.modules.flatMap((module) => module[1]).length, 18);
    assert.ok(course.outcomes.length >= 5);
    assert.ok(course.prerequisites.length >= 1);
  }
});

test("SkillForge seed has stable related data counts and identifiers", () => {
  assert.equal(instructors.length, 3);
  assert.equal(students.length, 5);
  assert.equal(categories.length, 5);
  assert.equal(courses.reduce((total, course) => total + course.modules.length, 0), 18);
  assert.equal(courses.reduce((total, course) => total + course.modules.flatMap((module) => module[1]).length, 0), 54);
  assert.equal(courses.length, 3);
  assert.equal(courses.length * students.length, 15);
});

test("all required local course thumbnails exist", () => {
  for (const [, , thumbnailUrl] of requiredCourses) {
    const filePath = path.join(process.cwd(), "artifacts", "skillforge-ai", "public", thumbnailUrl);
    assert.equal(fs.existsSync(filePath), true, `${thumbnailUrl} should exist`);
    assert.ok(fs.statSync(filePath).size > 1024, `${thumbnailUrl} should not be empty`);
  }
});
