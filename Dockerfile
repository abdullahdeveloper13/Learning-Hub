FROM node:22-alpine AS base

WORKDIR /app

# pnpm version is pinned in the root package.json "packageManager" field so
# local dev, CI, Vercel, Railway and Docker all use a lockfile-compatible pnpm.
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc ./

COPY artifacts/api-server/package.json artifacts/api-server/package.json
COPY artifacts/skillforge-ai/package.json artifacts/skillforge-ai/package.json
COPY artifacts/mockup-sandbox/package.json artifacts/mockup-sandbox/package.json

COPY lib/api-client-react/package.json lib/api-client-react/package.json
COPY lib/api-spec/package.json lib/api-spec/package.json
COPY lib/api-zod/package.json lib/api-zod/package.json
COPY lib/db/package.json lib/db/package.json
COPY lib/object-storage-web/package.json lib/object-storage-web/package.json

COPY scripts/package.json scripts/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS builder

COPY . .

# Build only what this image runs: the frontend (served by Express when present)
# and the API server. Shared lib/* packages export TypeScript source directly,
# so they are bundled by esbuild/vite and need no build step of their own.
RUN pnpm --filter @workspace/skillforge-ai --filter @workspace/api-server run build

FROM base AS runner

ENV NODE_ENV=production

# The API server bundles all runtime dependencies into dist/index.mjs, so the
# runtime image only needs the built output plus static assets.
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/skillforge-ai/dist ./artifacts/skillforge-ai/dist
COPY --from=builder /app/media ./media

WORKDIR /app

EXPOSE 3000

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
