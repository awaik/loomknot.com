# =============================================================================
# NestJS + Fastify — Multi-stage production build
# =============================================================================
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/api/package.json ./apps/api/

RUN corepack enable pnpm && pnpm install --frozen-lockfile

# --- Build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .

RUN corepack enable pnpm && pnpm --filter @loomknot/shared build && pnpm --filter @loomknot/api build

# --- Production ---
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Preserve monorepo structure (pnpm hoists deps to root node_modules)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared/package.json ./packages/shared/

USER nestjs
WORKDIR /app/apps/api
EXPOSE 4000
ENV PORT=4000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=30s \
  CMD curl -sf http://localhost:4000/api/v1/health || exit 1

CMD ["node", "dist/main.js"]
