# =============================================================================
# MCP Server — Agent gateway (Model Context Protocol)
# =============================================================================
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/mcp/package.json ./apps/mcp/

RUN corepack enable pnpm && pnpm install --frozen-lockfile

# --- Build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/mcp/node_modules ./apps/mcp/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .

RUN corepack enable pnpm && pnpm --filter @loomknot/mcp build

# --- Production ---
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 mcpuser

COPY --from=builder --chown=mcpuser:nodejs /app/apps/mcp/dist ./dist
COPY --from=builder --chown=mcpuser:nodejs /app/apps/mcp/node_modules ./node_modules
COPY --from=builder --chown=mcpuser:nodejs /app/apps/mcp/package.json ./

USER mcpuser
EXPOSE 4100
ENV PORT=4100

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=20s \
  CMD curl -sf http://localhost:4100/mcp/health || exit 1

CMD ["node", "dist/server.js"]
