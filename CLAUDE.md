# CLAUDE.md

AI Assistant Instructions for Loomknot — Pages as Memory Platform (Turborepo Monorepo)

## Project Concept

**Loomknot** — a platform where page = memory = dynamic interface. Each page simultaneously serves as content for humans, structured data for AI agents, and project memory that adapts to each user.

**Key Principles:**
- "Pages as Memory" — the project page IS the memory that any connected agent reads via MCP
- "Bring your own agent" — users connect their own AI agents (Claude, ChatGPT, Gemini) to a shared project
- "Preference negotiation" — agents propose compromises when participant preferences conflict
- Built-in default agent for new users + option to connect your own (upgrade, not onboarding)

**Launch vertical:** Travel. Architecture is domain-agnostic.

**Project documentation:** `docs/` — [DATA_MODEL.md](./docs/DATA_MODEL.md), [LAUNCH_PLAN.md](./docs/LAUNCH_PLAN.md), [MCP_TOOLS.md](./docs/MCP_TOOLS.md), [BLOCKS_PROTOCOL.md](./docs/BLOCKS_PROTOCOL.md), [EMAIL.md](./docs/EMAIL.md)

**AiTML Specification:** `/Users/mavbook/projects/AiTML - project/aitml/` — the open spec for AI-generated content blocks, extracted from Loomknot's block format. See [AiTML CLAUDE.md](/Users/mavbook/projects/AiTML - project/aitml/CLAUDE.md) for the full guide.

---

## Production Server

**Server:** Hetzner, 88.99.138.18
**Domain:** loomknot.com (Cloudflare DNS, **DNS-only** — no proxy, required for Let's Encrypt HTTP challenge)
**Security:** UFW (22/80/443), fail2ban, unattended-upgrades

- Ubuntu 24.04.3 LTS
- hostname: loomknot
- CPU: 8 cores
- RAM: 62 GB
- RAID 1 (mirror) — both disks [UU] (synchronized)
- Disks: root 49G, var 394G, home 20G, boot 1G, tmp 5G
- SSH: `ssh loomknot` — passwordless (`~/.ssh/id_ed25519`)

```bash
ssh loomknot
# Host loomknot → 88.99.138.18, User root, IdentityFile ~/.ssh/id_ed25519
```

### Server Structure

```
/opt/
├── traefik/                           # Reverse proxy (Swarm stack "traefik")
│   ├── docker-compose.yml
│   ├── traefik.yml                    # Static config (swarm provider + file provider)
│   ├── dynamic/
│   │   ├── minio.yml                  # MinIO S3 routing (file provider)
│   │   └── security-headers.yml       # HSTS, XSS, CSP headers
│   └── acme.json                      # Let's Encrypt certs (chmod 600)
├── apps/
│   └── loomknot/                      # Main application
│       ├── docker-compose.infra.yml   # postgres, redis, minio, pg-backup (Docker Compose)
│       ├── docker-compose.swarm.yml   # web, api, mcp (Swarm stack "loomknot")
│       ├── .env.backend               # NestJS env
│       ├── .env.frontend              # Next.js env
│       ├── .env.mcp                   # MCP server env
│       └── .env.infra                 # postgres/redis/minio credentials
└── backups/postgres/                  # pg-backup host mount
```

### Architecture: Swarm vs Compose

| What | Management | Stack/Compose name | Why |
|------|-----------|-------------------|-----|
| **Traefik** | Swarm stack | `traefik` | Auto-restart, always running |
| **Web + API + MCP** | Swarm stack | `loomknot` | Rolling updates, rollback on failure, zero-downtime |
| **PostgreSQL, Redis, MinIO, Backups** | Docker Compose | standalone | Data safety, no rolling restarts for stateful |

### Network Architecture

Two overlay networks (both `--attachable` for Swarm ↔ Compose connectivity):

- **`traefik-public`** — Traefik ↔ all web services (web, api, mcp, minio)
- **`loomknot-internal`** — services ↔ databases (not visible from Traefik)

```
Internet :80/:443 → Traefik (TLS termination, Let's Encrypt)
                       │ traefik-public
              ┌────────┼────────┬────────┐
              ▼        ▼        ▼        ▼
            web      api      mcp     minio
              │        │        │
              │ loomknot-internal
              ▼        ▼        ▼
          postgres   redis   pg-backup
```

### Traefik routing (production)

| Priority | Router | Rule | Service |
|----------|--------|------|---------|
| 35 | loomknot-s3 | `Host(loomknot.com) && PathPrefix(/s3)` | MinIO :9000 (file provider) |
| 30 | loomknot-mcp | `Host(loomknot.com) && PathPrefix(/mcp)` | MCP :4100 |
| 25 | loomknot-ws | `Host(loomknot.com) && PathPrefix(/socket.io)` | API :4000 (sticky sessions) |
| 20 | loomknot-api | `Host(loomknot.com) && PathPrefix(/api/v1)` | API :4000 |
| 10 | loomknot-web | `Host(loomknot.com)` | Web :3000 |

### Server Commands

```bash
# === Swarm stacks ===
docker stack ls                                   # All stacks
docker stack services loomknot                    # App services
docker service logs loomknot_web --tail 100       # Web logs
docker service logs loomknot_api --tail 100       # API logs
docker service logs loomknot_mcp --tail 100       # MCP logs
docker service logs traefik_traefik --tail 50     # Traefik logs

# Manual redeploy (force update without changing image)
docker service update --force loomknot_web
docker service update --force loomknot_api
docker service update --force loomknot_mcp

# Service rollback
docker service rollback loomknot_api

# Scaling
docker service scale loomknot_web=3

# === Infra (Docker Compose) ===
cd /opt/apps/loomknot
docker compose -f docker-compose.infra.yml --env-file .env.infra ps
docker compose -f docker-compose.infra.yml --env-file .env.infra logs -f postgres
docker compose -f docker-compose.infra.yml --env-file .env.infra restart redis

# === Traefik ===
docker stack deploy -c /opt/traefik/docker-compose.yml traefik

# === Diagnostics ===
docker network ls
docker node ls
# NOTE: services are in overlay network, health checks via Traefik (not localhost)
curl -sf https://loomknot.com/api/v1/health    # API health
curl -sf https://loomknot.com/api/health        # Web health
curl -sf https://loomknot.com/mcp/health        # MCP health
```

### PostgreSQL Backups

- **Automatic:** `prodrigestivill/postgres-backup-local` (daily, retention 14d/4w/6m)
- **Storage:** `/opt/backups/postgres/` (host mount)
- **Manual backup:** `docker exec loomknot-postgres pg_dump -U loomknot loomknot > backup.sql`
- **Restore:** `cat backup.sql | docker exec -i loomknot-postgres psql -U loomknot loomknot`

---

## Deploy

**Deploy is done ONLY via push to `main` → GitHub Actions (`.github/workflows/deploy.yml`).**
**NEVER deploy manually — only merge PR to main or push to main.**

### Deploy Pipeline

```
push to main
  ├─ build-web       → ghcr.io/awaik/loomknot.com/web:{latest,sha-<commit>}
  ├─ build-api       → ghcr.io/awaik/loomknot.com/api:{latest,sha-<commit>}
  ├─ build-mcp       → ghcr.io/awaik/loomknot.com/mcp:{latest,sha-<commit>}
  └─ build-migrate   → ghcr.io/awaik/loomknot.com/migrate:{latest,sha-<commit>}
       │
       ▼ deploy (after all builds)
  1. Copy docker-compose.swarm.yml to server
  2. GHCR login via GITHUB_TOKEN
  3. docker pull (4 images by SHA tag)
  4. docker run migrate (drizzle-kit push --force)
  5. docker stack deploy --resolve-image always --with-registry-auth
  6. Service convergence loop (wait for all replicas Running)
  7. Health check warmup with retries (60s per endpoint)
```

**Concurrency:** `deploy-production` group, no parallel deploys.
**Rolling update:** start-first (new container starts before old one stops), failure_action: rollback.
**Image tags:** `latest` + `sha-<commit>` for traceability and rollback.

### GitHub Secrets

| Secret | Value |
|--------|-------|
| `SERVER_HOST` | `88.99.138.18` |
| `SERVER_USER` | `root` |
| `SERVER_SSH_KEY` | Private SSH key (`~/.ssh/id_ed25519`) |
| `DOMAIN` | `loomknot.com` |

### Deploy Configuration (repo files)

| File | Description |
|------|-------------|
| `docker-compose.swarm.yml` | Swarm stack: web (×2) + api (×1) + mcp (×1), Traefik labels |
| `docker-compose.infra.yml` | Compose: postgres + redis + minio + pg-backup (installed manually) |
| `Dockerfile.migrate` | Migration container (drizzle-kit push) |
| `apps/web/Dockerfile` | Next.js frontend image |
| `apps/api/Dockerfile` | NestJS backend image |
| `apps/mcp/Dockerfile` | MCP server image |
| `deploy/server-init.sh` | Server initial setup script |
| `deploy/traefik/` | Traefik configs (traefik.yml, dynamic/, docker-compose.yml) |
| `deploy/env-templates/` | .env file templates |

---

## System Architecture

Turborepo monorepo. Production: Traefik v3 (swarm provider) + Docker Swarm (stateless) + Docker Compose (stateful).

| Service | Port | Description |
|---------|------|-------------|
| **Traefik v3** | 80/443 | Reverse proxy, auto SSL (Let's Encrypt), swarm + file providers |
| **PostgreSQL 16 + pgvector** | 5432 | Vector search for semantic memory, Drizzle ORM |
| **Redis 7** | 6379 | Cache, sessions, pub/sub between services |
| **NestJS + Fastify** | 4000 | REST `/api/v1/*`, JWT (jose), Socket.io, Pino |
| **Next.js 15** | 3000 | React 19, TanStack Query, Tailwind CSS 4, shadcn/ui |
| **MCP Server** | 4100 | @modelcontextprotocol/sdk, SSE transport, agent gateway |
| **MinIO** | 9000/9001 | S3-compatible storage, routed via Traefik file provider |
| **Backups** | — | `prodrigestivill/postgres-backup-local`, 14d/4w/6m |

### Monorepo Structure

```
loomknot.com/
├── apps/
│   ├── web/                    # Next.js 15 — Frontend + Next.js API routes
│   ├── api/                    # NestJS 11 + Fastify — Core API, WebSocket
│   └── mcp/                    # MCP Server — Agent gateway (SSE transport)
├── packages/
│   ├── shared/                 # @loomknot/shared — types, constants, schemas
│   └── tsconfig/               # @loomknot/tsconfig — shared TS configs
├── deploy/
│   ├── traefik/                # Traefik configs
│   ├── env-templates/          # .env templates
│   └── server-init.sh          # Server bootstrap
├── docker-compose.yml          # Local dev
├── docker-compose.infra.yml    # Production: stateful
├── docker-compose.swarm.yml    # Production: stateless
└── Dockerfile.migrate          # Migration container
```

---

## Three-Level Memory Model

### Memory Levels

| Level | Visibility | Example |
|-------|------------|---------|
| **Private** | User's agent only | "don't like heat", "vegetarian", "budget €150/night" |
| **Project** | All agents in project | "flying March 15-22", "chose hotel X" |
| **Public** | Anyone via link | Final page "Barcelona for four, March 2026" |

### Dual Nature of Pages

Each page exists in two modes:
- **Human mode** — beautiful UI, map, photos, buttons
- **Agent mode** — structured data, preferences, constraints (WebMCP-compatible format)

### Preference Negotiation

When participant preferences conflict, agents don't just "see" each other's preferences — they propose compromises via constraint satisfaction. This is the core technical moat.

---

## Database: PostgreSQL 16 + pgvector + Drizzle ORM

**Schema** lives in `packages/shared/src/db/schema/` — single source of truth for all apps.

### Key Decisions

- **IDs**: time-sortable custom IDs (9-char base36 timestamp + 16-char hex random, ~25 chars). See `packages/shared/src/db/helpers.ts`
- **pgvector**: extension for vector embeddings (semantic memory search)
- **Timestamps**: `createdAt`, `updatedAt` with `defaultNow()`, `.$onUpdate()`
- **Types**: `$inferSelect` / `$inferInsert` from Drizzle schema (source of truth)
- **JSONB**: for flexible memory values and page content blocks

### Drizzle Commands

```bash
cd packages/shared
npx drizzle-kit push        # Apply schema to DB
npx drizzle-kit generate    # Generate migration
npx drizzle-kit studio      # UI viewer
```

---

## Auth: JWT (jose)

### Auth Flow

1. Email → `POST /api/v1/auth/send-magic-link` → 6-digit PIN via Resend
2. PIN → `POST /api/v1/auth/verify` → JWT pair (access in-memory, refresh in httpOnly cookie)
3. Middleware checks Bearer token, on 401 → auto-refresh via `/api/v1/auth/refresh`
4. OAuth (Google, GitHub) — optionally later

### Agent Auth (MCP)

1. User generates API key in project settings
2. Agent connects to MCP server with API key
3. MCP server validates key, binds to user + project
4. All agent operations scoped by user permissions in project

---

## MCP Server (`apps/mcp`)

Agent gateway — implements Model Context Protocol for connecting external AI agents.

### MCP Tools (exposed to agents)

```typescript
// Memory operations
'memory_read'     — read memory (private/project/public) with filtering
'memory_write'    — write to memory (respecting access level)
'memory_search'   — semantic search across memory (pgvector)
'memory_delete'   — delete memory entry

// Page operations
'page_get'        — get page content (agent mode)
'page_suggest'    — suggest page change
'page_list'       — list project pages

// Negotiation operations
'negotiations_list'    — list project negotiations
'negotiations_get'     — get negotiation with options and votes
'negotiations_propose' — propose option for open negotiation

// Project operations
'project_info'    — project and member info
'project_members' — list members and their agents
```

### Transport

- **SSE (Server-Sent Events)** — for web agents (Streamable HTTP)
- **stdio** — for CLI agents (Claude CLI, etc.)

---

## NestJS Backend (`apps/api`)

```
AppModule
├── LoggerModule (nestjs-pino)
├── DatabaseModule (global, DRIZZLE_DB provider)
├── RedisModule (ioredis, caching + pub/sub)
├── MinioModule (MinIO client provider)
├── AuthModule (JWT, magic link, refresh)
├── UsersModule (profile, avatar)
├── ProjectsModule (CRUD, members, invites)
├── PagesModule (CRUD, content blocks, rendering)
├── MemoryModule (3-level memory CRUD + vector search)
├── NegotiationModule (memory conflict resolution, voting)
├── AgentModule (agent connections, API keys)
├── HealthModule (@nestjs/terminus)
└── SocketModule (WebSocketGateway — auth, presence, rooms)
```

**Guards** (global): `JwtAuthGuard` (JWT, `@Public()` skip), `ProjectMemberGuard` (`x-project-id` → membership check)

**Decorators**: `@Public()`, `@CurrentUser()`, `@ProjectId()`

---

## Frontend (`apps/web`) — Next.js 15

### Tech Stack

- React 19, App Router, Server Components
- TanStack Query v5 — server state
- Zustand v5 — client UI state
- Tailwind CSS 4 + shadcn/ui — styling
- Socket.io client — realtime
- Lucide React — icons

### Providers

```typescript
AuthProvider → QueryClientProvider → SocketProvider → ProjectProvider → {children}
```

---

## Realtime: Socket.io

Rooms and Events defined in `@loomknot/shared`.

```typescript
// Client-side: useSocketRoom — subscription with debounced invalidation
useSocketRoom({
  room: ROOMS.project(projectId),
  events: [EVENTS.MEMORY_UPDATED, EVENTS.PAGE_UPDATED, EVENTS.AGENT_CONNECTED],
  queryKeys: [['project', projectId]],
  debounceMs: 150,
});
```

---

## RBAC — 5 Roles

| Role | canManageProject | canManageMembers | canEditMemory | canConnectAgent | canView |
|------|:----------------:|:----------------:|:-------------:|:---------------:|:-------:|
| **owner** | + | + | + | + | + |
| **admin** | + | + | + | + | + |
| **editor** | - | - | + | + | + |
| **member** | - | - | - | + | + |
| **viewer** | - | - | - | - | + |

---

## Commands

```bash
# Monorepo (root)
pnpm install              # Install dependencies
pnpm build                # Build all packages (turbo)
pnpm dev                  # Dev mode (turbo)
pnpm type-check           # TypeScript check (turbo)

# Hybrid Dev (recommended for development)
./start-backend.sh        # Terminal 1: postgres + redis + minio + caddy + NestJS dev
./start-frontend.sh       # Terminal 2: Next.js dev on port 3000
./start-mcp.sh            # Terminal 3: MCP server dev on port 4100
# Caddy → http://localhost:8026

# Backend (cd apps/api)
pnpm dev                  # Watch mode (port 4000)
pnpm build                # Production build

# Frontend (cd apps/web)
pnpm dev                  # Development (port 3000)
pnpm build                # Production build
npx tsc --noEmit          # Type check

# MCP Server (cd apps/mcp)
pnpm dev                  # Watch mode (port 4100)
pnpm build                # Production build

# Database (cd packages/shared)
npx drizzle-kit push      # Apply schema
npx drizzle-kit generate  # Generate migration
npx drizzle-kit studio    # UI viewer

# Docker (local dev)
docker compose up -d              # Start infra
docker compose logs -f postgres   # Logs
docker compose down               # Stop
```

**Local URLs**: App http://localhost:8026, Frontend http://localhost:3000, API http://localhost:4000, MCP http://localhost:4100

---

## CRITICAL RULES

### 1. Language

- **ALL documentation, comments, and project content MUST be in English**
- Code, docs, comments, commit messages, PR descriptions — everything in English

### 2. TypeScript

- **NEVER use `any`** — types from Drizzle schema + `@loomknot/shared`
- **ALWAYS import types** before usage

### 3. Database

- **Schema lives in `packages/shared/src/db/schema/`** — single source of truth
- **NEVER run drizzle-kit from `apps/api` or `apps/mcp`** — only `packages/shared`
- **ALWAYS filter by projectId** in project-scoped queries
- **ALWAYS use transactions** for mutations with side effects
- **ALWAYS check memory level permissions** — private memory visible only to owner

### 4. Backend (NestJS)

- **ALWAYS use guards** — JwtAuthGuard + ProjectMemberGuard
- **Use @Public()** for public endpoints
- **ALWAYS emit Socket.io events** after mutations
- **Use Drizzle query builder** — no raw SQL (except complex JOIN/subquery)

### 5. Frontend (React)

- **ALWAYS use 'use client'** for client components
- **ALWAYS use TanStack Query** for server state
- **Use Zustand** for shared UI state
- **ALWAYS invalidate queries** after mutations
- **NEVER store server data in useState**
- **NEVER fetch directly** — only through hooks

### 6. MCP Server

- **ALWAYS validate API key** before executing operations
- **ALWAYS scope operations** by user permissions in project
- **ALWAYS rate-limit** agent requests
- **NEVER expose private memory** to other agents/users
- **Log all agent operations** for audit

### 7. Security

- **NEVER expose API keys** in client-side code
- **ALWAYS validate input** via Zod
- **ALWAYS use parameterized queries** — never string interpolation in SQL
- **Private memory isolation** — critical security requirement

### 8. Monorepo

- **Use pnpm** (not npm/yarn) — monorepo with workspaces
- **Shared types → `@loomknot/shared`** — don't duplicate between apps
- **Docker builds**: monorepo-aware multi-stage Dockerfiles
  - **ALWAYS build `@loomknot/shared` before app** in Dockerfiles (`pnpm --filter @loomknot/shared build && pnpm --filter @loomknot/<app> build`)
  - **Runner stage must preserve pnpm monorepo structure** — copy root `node_modules`, workspace `node_modules`, and `packages/shared/{dist,node_modules,package.json}`
  - **Next.js standalone** in monorepo outputs `server.js` at `apps/web/server.js` (not root)
  - **Migrate container** runs from `packages/shared` (where drizzle config lives)
- **Use BLOCK_TYPES constants** for block type references — defined in `@loomknot/shared/constants`

### 9. AiTML Spec Sync

Loomknot's block format is formalized as **AiTML** — an open specification at `/Users/mavbook/projects/AiTML - project/aitml/`.

- **When adding/changing block types** in Loomknot → update AiTML spec (`WHITEPAPER.md` section 7) and `CHANGELOG.md`
- **When changing `page_blocks` schema** → update AiTML block structure (`WHITEPAPER.md` section 6) and field mapping table in AiTML `CLAUDE.md`
- **When changing `BLOCKS_PROTOCOL.md`** → check if AiTML spec needs the same update
- **Always update AiTML `CHANGELOG.md`** when block-related changes originate from Loomknot
- Check AiTML `CLAUDE.md` for the field mapping table (Loomknot `content` = AiTML `data`, `agentData` = `agent`, `sortOrder` = `order`, etc.)

---

**IMPORTANT: Apply only professional production-grade solutions!**
**IMPORTANT: Never add fallbacks — always ask the user about the issue, write only clean code.**
**IMPORTANT: Never write workarounds, always report issues in chat.**

---

## MCP Tools

- **Context7** — library documentation (Next.js, React, NestJS, MCP SDK, Drizzle, Tailwind)

---

**Version**: 1.0
**Last updated**: 2026-03-09
**Architecture**: Turborepo + NestJS 11/Fastify + Next.js 15 + PostgreSQL 16/pgvector + Redis 7 + Drizzle ORM + MCP (@modelcontextprotocol/sdk) + JWT (jose) + Socket.io + Traefik v3 (swarm provider) + Docker Swarm
**Local port**: 8026

## Code Navigation Rules

When tracing where a symbol is defined or finding all references to it, use LSP (goToDefinition, findReferences, hover) instead of Grep. LSP gives exact results; Grep gives text matches. Use Grep/Glob for discovery (finding files, searching patterns). Use LSP for understanding (definitions, references, type info). After locating a file with Grep/Glob, use LSP to navigate within it rather than reading the whole file.
