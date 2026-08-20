FROM node:22-alpine AS base

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.22.0 --activate

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

COPY artifacts/api-server/package.json artifacts/api-server/package.json
COPY artifacts/skillforge-ai/package.json artifacts/skillforge-ai/package.json
COPY artifacts/mockup-sandbox/package.json artifacts/mockup-sandbox/package.json

COPY lib/api-client-react/package.json lib/api-client-react/package.json
COPY lib/api-zod/package.json lib/api-zod/package.json
COPY lib/db/package.json lib/db/package.json

COPY scripts/package.json scripts/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS builder

COPY . .

RUN pnpm run build

FROM base AS runner

ENV NODE_ENV=production

COPY --from=builder /app /app

WORKDIR /app

EXPOSE 3000

CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]