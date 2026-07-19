---
name: SkillForge AI Architecture
description: Stack decisions and key conventions for the SkillForge AI LMS project.
---

## Stack
- Frontend: `artifacts/skillforge-ai` (React + Vite), preview at `/`
- Backend: `artifacts/api-server` (Express 5), serves at `/api`
- DB: PostgreSQL via Drizzle ORM in `lib/db`, schema in `lib/db/src/schema/`
- API client: `lib/api-client-react` — exports via `.`, `./api`, and `./api.schemas` subpaths

## Auth
- JWT tokens, secret in `JWT_SECRET` env var (falls back to dev key)
- Frontend stores token as `sf_token` in localStorage, user as `sf_user`
- Middleware in `artifacts/api-server/src/middlewares/auth.ts`

## Seed Accounts (all password: `password`)
- admin@skillforge.ai — admin
- sarah.chen@skillforge.ai — instructor
- marcus.johnson@skillforge.ai — instructor
- priya.patel@skillforge.ai — instructor
- james.wilson@skillforge.ai — student (and others 6-10)

## Key Fixes Applied
- Added `./api` and `./api.schemas` subpath exports to `lib/api-client-react/package.json` (design subagent used these subpath imports)
- `App.tsx` imports `Toaster` from `@/components/ui/toaster` (not `toast`)
- `toast.tsx` re-exports `useToast` and `toast` from `@/hooks/use-toast`
- `ThemeToggle` in layout folder re-exports from `@/components/shared/ThemeToggle`

**Why:** Design subagent generated import paths assuming subpath exports; these must be declared explicitly in package.json exports field.
