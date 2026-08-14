import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

process.env.DATABASE_URL ??= "postgresql://skillforge:skillforge@localhost:5432/skillforge";
process.env.JWT_SECRET ??= "test-secret";

const [{ validateUpload }, { gradeQuizAttempt }, { isCourseComplete }, { verifyStripeSignature }, rateLimitModule] = await Promise.all([
  import("../../artifacts/api-server/src/routes/storage.ts"),
  import("../../artifacts/api-server/src/routes/quizzes.ts"),
  import("../../artifacts/api-server/src/routes/progress.ts"),
  import("../../artifacts/api-server/src/routes/payments.ts"),
  import("../../artifacts/api-server/src/middlewares/rateLimit.ts"),
]);

test("upload validation accepts LMS file types and rejects unsafe uploads", () => {
  assert.equal(validateUpload({ name: "thumbnail.jpg", size: 2048, contentType: "image/jpeg", folder: "course-thumbnails/web", role: "instructor" }), null);
  assert.equal(validateUpload({ name: "lesson.mp4", size: 50_000, contentType: "video/mp4", folder: "course-videos/web", role: "admin" }), null);
  assert.equal(validateUpload({ name: "brief.pdf", size: 10_000, contentType: "application/pdf", folder: "lesson-resources/web", role: "instructor" }), null);
  assert.equal(validateUpload({ name: "starter.zip", size: 10_000, contentType: "application/zip", folder: "assignment-submissions/web", role: "student" }), null);
  assert.match(validateUpload({ name: "script.exe", size: 10, contentType: "application/x-msdownload", folder: "course-media", role: "admin" }) ?? "", /not allowed/);
  assert.match(validateUpload({ name: "video.mp4", size: 11, contentType: "video/mp4", folder: "course-videos/web", role: "student" }) ?? "", /Only instructors/);
});

test("quiz grading supports multiple choice, true false, and fill blank normalization", () => {
  const result = gradeQuizAttempt([
    { id: 1, type: "multiple_choice", options: [{ id: "a", text: "No", isCorrect: false }, { id: "b", text: "Yes", isCorrect: true }], correctAnswer: "Yes", points: 2 },
    { id: 2, type: "true_false", options: [], correctAnswer: "True", points: 1 },
    { id: 3, type: "fill_blank", options: [], correctAnswer: "database", points: 1 },
  ], [
    { questionId: 1, answer: "b" },
    { questionId: 2, answer: "true" },
    { questionId: 3, answer: " Database " },
  ], 70);
  assert.equal(result.earnedPoints, 4);
  assert.equal(result.totalPoints, 4);
  assert.equal(result.score, 100);
  assert.equal(result.passed, true);
});

test("certificate eligibility requires all lessons and required assessments", () => {
  assert.equal(isCourseComplete(54, 54, true), true);
  assert.equal(isCourseComplete(53, 54, true), false);
  assert.equal(isCourseComplete(54, 54, false), false);
  assert.equal(isCourseComplete(0, 0, true), false);
});

test("Stripe webhook signatures must match the raw payload", () => {
  const payload = Buffer.from(JSON.stringify({ type: "checkout.session.completed" }));
  const timestamp = "1786740000";
  const secret = "whsec_test";
  const signature = createHmac("sha256", secret).update(`${timestamp}.${payload.toString("utf8")}`).digest("hex");
  assert.equal(verifyStripeSignature(payload, `t=${timestamp},v1=${signature}`, secret), true);
  assert.equal(verifyStripeSignature(payload, `t=${timestamp},v1=${signature}`, "wrong"), false);
});

test("memory rate limiter blocks requests after the configured threshold", async () => {
  const store = new rateLimitModule.MemoryRateLimitStore();
  assert.deepEqual(await store.increment("login:1", 60_000, 2), { allowed: true });
  assert.deepEqual(await store.increment("login:1", 60_000, 2), { allowed: true });
  const third = await store.increment("login:1", 60_000, 2);
  assert.equal(third.allowed, false);
  assert.ok((third.retryAfter ?? 0) > 0);
});
