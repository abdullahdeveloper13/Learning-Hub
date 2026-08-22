# SkillForge AI


SkillForge AI is a full-stack learning management system with course discovery, student learning flows, instructor course management, admin operations, AI-assisted content generation, certificates, notifications, messaging, and provider-based integrations for payments, email, storage, and AI.

## Technology

- React, Vite, TypeScript, Tailwind CSS, shadcn-style UI components
- Express API server
- PostgreSQL with Drizzle ORM
- JWT authentication with bcrypt password hashing
- Supabase-compatible storage abstraction
- OpenAI-compatible AI provider abstraction
- Stripe-ready payment abstraction
- Resend-ready email abstraction

## Installation

```bash
git clone <repository-url>
cd learning-hub
pnpm install
cp .env.example .env
```

Set `DATABASE_URL` and a strong `JWT_SECRET` in `.env`.
`DATABASE_URL` must be a PostgreSQL URL that starts with `postgresql://` or `postgres://`; the Supabase HTTPS project URL belongs in `SUPABASE_URL`, not `DATABASE_URL`.

## Development

Run the API server:

```bash
pnpm --filter @workspace/api-server run dev
```

Run the frontend in another terminal:

```bash
pnpm --filter @workspace/skillforge-ai run dev
```

The frontend proxies `/api` to `http://localhost:3000` by default.

## Database

Push the Drizzle schema:

```bash
pnpm --filter @workspace/db run push
```

Seed SkillForge development data:

```bash
pnpm run seed:skillforge
```

The seed is idempotent for the included categories, instructors, students, courses, modules, lessons, quizzes, assignments, enrollments, and reviews.

For Supabase production databases, prefer the Supabase connection pooler when direct database DNS or IPv6 routing is unavailable:

```text
postgresql://postgres.<project-ref>:<url-encoded-password>@<pooler-host-from-dashboard>:5432/postgres
```

Copy the exact pooler or direct connection string from Supabase Dashboard > Project Settings > Database. If the password contains special characters such as `@`, `!`, `$`, `%`, or spaces, URL-encode the password before placing it in `DATABASE_URL`. Do not commit this value.

Check the active database configuration without printing secrets:

```bash
pnpm run db:diagnose
```

## Environment Variables

- `PORT`: API server port.
- `BASE_PATH`: Vite asset base path.
- `VITE_API_URL`: browser API base URL.
- `PUBLIC_APP_URL`: public frontend URL used in emails and redirects.
- `API_PUBLIC_URL`: public API URL used for OAuth callback URLs.
- `CORS_ORIGINS`: comma-separated browser origins allowed to call the API.
- `JWT_SECRET`: signs API session tokens.
- `DATABASE_URL`: PostgreSQL connection string.
- `SUPABASE_URL`: Supabase project URL for REST/storage fallback.
- `SUPABASE_ANON_KEY`: public Supabase anon key.
- `VITE_SUPABASE_URL`: public Supabase project URL used by browser OAuth.
- `VITE_SUPABASE_ANON_KEY`: public Supabase anon key used by browser OAuth.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase service key.
- `SUPABASE_STORAGE_BUCKET`: storage bucket for uploaded LMS assets.
- `OPENAI_API_KEY`: server-only OpenAI API key.
- `OPENAI_MODEL`: model for AI generation.
- `GOOGLE_CLIENT_ID`: Google OAuth client ID.
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret.
- `GITHUB_CLIENT_ID`: GitHub OAuth client ID.
- `GITHUB_CLIENT_SECRET`: GitHub OAuth client secret.
- `PAYMENT_PROVIDER`: payment provider label, currently `manual` or Stripe-backed checkout.
- `STRIPE_SECRET_KEY`: Stripe secret key for checkout sessions.
- `STRIPE_PUBLISHABLE_KEY`: Stripe publishable key for server-side display/configuration checks.
- `VITE_STRIPE_PUBLISHABLE_KEY`: optional browser-safe Stripe publishable key if Stripe.js UI is added later.
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret.
- `EMAIL_PROVIDER`: `console` for development or `resend` for transactional email.
- `EMAIL_FROM`: default transactional email sender.
- `RESEND_API_KEY`: Resend API key.
- `RATE_LIMIT_STORE`: `memory` for development or `redis` for production distributed rate limiting.
- `UPSTASH_REDIS_REST_URL`: Upstash Redis REST URL for production rate limiting.
- `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis REST token for production rate limiting.

## Supabase Google/GitHub OAuth

SkillForge uses Supabase Auth for Google and GitHub signup/signin, then exchanges the verified Supabase session for the app's own JWT session at `/api/auth/supabase/exchange`.

In Supabase Dashboard:

1. Go to Authentication > URL Configuration.
2. Set the Site URL to your frontend URL.
3. Add redirect URLs:
   - `http://localhost:5173/auth/callback`
   - `http://localhost:3000/auth/callback`
   - your deployed app URL plus `/auth/callback`
4. Go to Authentication > Sign In / Providers.
5. Enable Google and GitHub.
6. Add each provider's client ID and client secret.

OAuth provider callback URLs should use Supabase's callback URL:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

For this project ref, that provider callback URL is:

```text
https://vqpdlagmeatubprlfgkz.supabase.co/auth/v1/callback
```

Do not add an extra suffix such as `/callback1` unless Supabase Dashboard explicitly shows that exact URL on the provider page. Google and GitHub should use the same Supabase Auth callback URL. The SkillForge frontend redirect remains `/auth/callback`.

Do not put Google or GitHub client secrets in frontend variables.

## Stripe Checkout

Paid courses use server-created Stripe Checkout sessions. The frontend calls `POST /api/payments/checkout`, receives a Stripe Checkout URL, and redirects the learner to Stripe. Paid enrollment is granted only after the API receives a signed Stripe webhook and updates the order to `paid`.

Required server-side environment variables:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PUBLIC_APP_URL=http://localhost:5173
```

The webhook endpoint is:

```text
http://localhost:3000/api/payments/webhook/stripe
```

In Stripe Dashboard or the Stripe CLI, send at least these events to the webhook:

```text
checkout.session.completed
checkout.session.expired
payment_intent.payment_failed
```

Do not expose `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` in Vite/browser environment variables. Only the publishable key may use a `VITE_` prefix.

## Production

Build all workspaces:

```bash
pnpm run build
```

Start the API server:

```bash
pnpm --filter @workspace/api-server run start
```

When the frontend has been built, the API server serves the repo-root `dist` folder as a static single-page app.

## Docker

```bash
docker compose up --build
```

Compose starts PostgreSQL, pushes the Drizzle schema, runs the SkillForge seed, and then starts the app on `http://localhost:3000`.

The Compose seed creates the three primary development courses:

- Complete Web Development Bootcamp
- Python Programming from Beginner to Advanced
- AI & Machine Learning Masterclass

## External Services

The app works locally with console email and configuration-aware payment/AI/storage fallbacks. Production use requires real credentials for PostgreSQL, OAuth, email, AI, payment, and storage providers. Secrets must only be configured server-side.

## Validation

```bash
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run build
pnpm --filter @workspace/db run push
pnpm run seed:skillforge
```
