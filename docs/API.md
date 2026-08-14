# SkillForge AI API

All API routes are served under `/api`. Authenticated routes require `Authorization: Bearer <jwt>`.

## Authentication

### POST `/auth/register`

Creates a student, instructor, or admin account. Passwords are hashed with bcrypt. Sends an email verification event through the email service.

Request: `name`, `email`, `password`, optional `role`.

### POST `/auth/login`

Authenticates email/password and returns a JWT plus the user profile.

Request: `email`, `password`.

### POST `/auth/forgot-password`

Creates a hashed password reset token and sends a reset email when the account exists. Always returns a generic success response.

Request: `email`.

### POST `/auth/reset-password`

Validates a reset token and updates the password.

Request: `token`, `password`.

### POST `/auth/verify-email`

Validates an email verification token.

Request: `token`.

### POST `/auth/resend-verification`

Requires authentication. Sends a new email verification token for an unverified account.

### GET `/auth/oauth/:provider/start`

Starts Google or GitHub OAuth. Returns `503` with required environment variable names when the provider is not configured.

### GET `/auth/oauth/:provider/callback`

Completes Google or GitHub OAuth and redirects to the frontend with a short-lived JWT.

## Courses

### GET `/courses`

Lists published courses. Supports search, category, level, instructor, pagination, and sorting query parameters.

### GET `/courses/:id`

Returns a course by numeric ID.

### GET `/courses/slug/:slug`

Returns a course by slug with instructor, category, modules, lessons, resources, quizzes, assignments, and reviews.

### POST `/courses`

Instructor or admin only. Creates a course.

### PATCH `/courses/:id`

Course instructor or admin only. Updates a course.

### DELETE `/courses/:id`

Course instructor or admin only. Archives or removes a course according to route behavior.

## Enrollments

### POST `/enrollments`

Requires authentication. Enrolls in a free course or returns `402 Payment required` for paid courses unless a verified paid order exists.

### GET `/enrollments`

Returns current user enrollments.

## Progress

### POST `/progress`

Requires authentication and course access. Records lesson progress.

## Quizzes

### POST `/quizzes/:quizId/attempts`

Requires authentication and enrollment. Submits answers and stores an automatically graded attempt where supported.

## Assignments

### POST `/assignments/:assignmentId/submissions`

Requires authentication and enrollment. Creates or updates a student submission.

### PATCH `/assignments/submissions/:submissionId/grade`

Instructor or admin only. Grades a submission and stores feedback.

## Certificates

### POST `/certificates`

Requires authentication. Issues a certificate when the student meets completion requirements.

### GET `/certificates/verify/:credentialId`

Public. Verifies a certificate by credential ID.

## Payments

### POST `/payments/checkout`

Requires authentication. Creates free enrollments immediately or creates a paid order and Stripe checkout session when configured. Never grants paid access from client-side success alone.

Request: `courseId`, optional `couponCode`.

### GET `/payments/orders`

Requires authentication. Lists the current user's orders.

### POST `/payments/webhook/stripe`

Stripe webhook endpoint. Requires `STRIPE_WEBHOOK_SECRET`.

### GET `/admin/payments/orders`

Admin only. Lists platform orders.

### POST `/admin/coupons`

Admin only. Creates a coupon.

### GET `/admin/coupons`

Admin only. Lists coupons.

### PATCH `/admin/coupons/:couponId`

Admin only. Updates coupon status and limits.

## Notifications

### GET `/notifications`

Requires authentication. Lists current user notifications.

### GET `/notifications/unread-count`

Requires authentication. Returns unread notification count.

### PATCH `/notifications/mark-read`

Requires authentication. Marks selected notifications as read.

### PATCH `/notifications/mark-all-read`

Requires authentication. Marks all current user notifications as read.

## Storage

### PUT `/storage/uploads/*`

Requires authentication. Validates ownership, role, folder, extension, MIME type, and size before uploading to storage.

### POST `/storage/signed-url`

Requires authentication. Creates a signed upload target after validation.

## AI

AI routes require authentication, request validation, server-side provider configuration, and per-user/IP rate limits. Routes return a configuration error if `OPENAI_API_KEY` is missing.

## Rate Limiting

Sensitive endpoints use the centralized rate-limit middleware. Local development defaults to the memory store. Production can use the Redis/Upstash REST store with:

- `RATE_LIMIT_STORE=redis`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Protected areas include authentication, password reset, email verification, AI, payments, webhooks, messaging, and uploads.

## Admin

### GET `/admin/stats`

Admin only. Returns database-backed platform statistics.

### GET `/admin/reports`

Admin only. Lists user/content reports.

### POST `/reports`

Requires authentication. Creates a report for a user, course, review, discussion, or comment.

### PATCH `/admin/reports/:reportId`

Admin only. Resolves or dismisses a report.

### GET `/admin/settings`

Admin only. Returns platform settings. Secret-like keys are not returned.

### PUT `/admin/settings/:key`

Admin only. Updates non-secret platform settings.
