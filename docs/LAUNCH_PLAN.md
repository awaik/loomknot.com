# Loomknot — Step-by-Step Launch Plan

## Phase 0: Foundation (Infrastructure)

### 0.1 Git + GitHub
- [ ] `git init` in the project root
- [ ] Create a GitHub repository (private)
- [ ] First commit with the entire structure
- [ ] Configure branch protection on `main` (require PR or direct push at start)
- [ ] Add GitHub Secrets: `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY`, `DOMAIN`

### 0.2 VPS + Docker Swarm
- [ ] Rent a VPS (Ubuntu 24.04, minimum 4GB RAM / 2 CPU / 80GB SSD)
- [ ] Configure SSH key and alias in `~/.ssh/config` (`Host loomknot`)
- [ ] Run `deploy/server-init.sh` on the server — installs Docker, Swarm, firewall, networks
- [ ] Verify: `docker node ls` shows the node in Ready status

### 0.3 DNS
- [ ] Point `loomknot.com` (A record) to the server IP
- [ ] Point `*.loomknot.com` (A record) to the same IP (for future subdomains)
- [ ] Wait for propagation (verify: `dig loomknot.com`)

### 0.4 Traefik
- [ ] Copy configs to the server:
  ```bash
  scp deploy/traefik/traefik.yml loomknot:/opt/traefik/
  scp deploy/traefik/dynamic/minio.yml loomknot:/opt/traefik/dynamic/
  scp deploy/traefik/docker-compose.yml loomknot:/opt/traefik/
  ```
- [ ] Change the email in `traefik.yml` to a real one (for Let's Encrypt)
- [ ] Deploy Traefik:
  ```bash
  ssh loomknot "docker stack deploy -c /opt/traefik/docker-compose.yml traefik"
  ```
- [ ] Verify: `ssh loomknot "docker service logs traefik_traefik --tail 20"` — no errors

### 0.5 Infrastructure Services
- [ ] Copy `.env.infra` to the server, fill in real passwords:
  ```bash
  scp deploy/env-templates/.env.infra loomknot:/opt/apps/loomknot/.env.infra
  ssh loomknot "nano /opt/apps/loomknot/.env.infra"
  ```
- [ ] Copy `docker-compose.infra.yml`:
  ```bash
  scp docker-compose.infra.yml loomknot:/opt/apps/loomknot/
  ```
- [ ] Start postgres + redis + minio + pg-backup:
  ```bash
  ssh loomknot "cd /opt/apps/loomknot && docker compose -f docker-compose.infra.yml --env-file .env.infra up -d"
  ```
- [ ] Verify:
  ```bash
  ssh loomknot "docker exec loomknot-postgres pg_isready -U loomknot"    # → accepting connections
  ssh loomknot "docker exec loomknot-redis redis-cli -a PASSWORD ping"   # → PONG
  ```

### 0.6 GHCR (GitHub Container Registry)
- [ ] Log in to GHCR on the server:
  ```bash
  ssh loomknot "echo GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin"
  ```
- [ ] Verify: `ssh loomknot "docker pull ghcr.io/OWNER/loomknot.com/web:latest"` — will return 404 for now, that's ok

**Phase 0 result:** Server is ready, Traefik serves SSL, postgres/redis/minio are running, CI/CD pipeline is configured.

---

## Phase 1: Skeleton (working empty services)

### 1.1 Install Dependencies
- [ ] `pnpm install` in the monorepo root
- [ ] Make sure `turbo` works: `pnpm build` (errors are expected for now — that's ok)

### 1.2 Next.js web — minimal skeleton
- [ ] `next.config.ts` with `output: 'standalone'`
- [ ] `src/app/layout.tsx` — root layout
- [ ] `src/app/page.tsx` — home page (placeholder)
- [ ] `src/app/api/health/route.ts` — health check endpoint (`{ status: 'ok' }`)
- [ ] `src/app/globals.css` — Tailwind CSS 4 setup
- [ ] Verify: `cd apps/web && pnpm dev` — opens http://localhost:3000

### 1.3 NestJS api — minimal skeleton
- [ ] `nest-cli.json`
- [ ] `src/main.ts` — Fastify adapter, port 4000
- [ ] `src/app.module.ts` — AppModule with LoggerModule + HealthModule
- [ ] `src/health/health.controller.ts` — `GET /api/v1/health`
- [ ] Verify: `cd apps/api && pnpm dev` — `curl localhost:4000/api/v1/health`

### 1.4 MCP server — minimal skeleton
- [ ] `src/server.ts` — Express + MCP SDK, port 4100
- [ ] `GET /mcp/health` — health check
- [ ] One test MCP tool: `ping` — returns `{ pong: true }`
- [ ] Verify: `cd apps/mcp && pnpm dev` — `curl localhost:4100/mcp/health`

### 1.5 Local Integration
- [ ] `docker compose up -d` — start postgres + redis + caddy
- [ ] `./start-backend.sh` → `./start-frontend.sh` → `./start-mcp.sh` (3 terminals)
- [ ] Verify via Caddy: http://localhost:8026 shows the frontend
- [ ] Verify: http://localhost:8026/api/v1/health → `{ status: 'ok' }`
- [ ] Verify: http://localhost:8026/mcp/health → `{ status: 'ok' }`

### 1.6 First Deploy
- [ ] Copy `.env.backend`, `.env.frontend`, `.env.mcp` to the server, fill in values
- [ ] Push to `main` → GitHub Actions builds 4 images → deploys
- [ ] Verify: `https://loomknot.com` — shows placeholder
- [ ] Verify: `https://loomknot.com/api/v1/health` → ok
- [ ] Verify: `https://loomknot.com/mcp/health` → ok

**Phase 1 result:** Three services are running in Swarm, zero-downtime deploy works, health checks pass.

---

## Phase 2: Data Layer (database + auth)

### 2.1 Drizzle Schema — core tables
- [ ] `packages/shared/src/db/schema/users.ts` — users (id, email, name, avatar, tokenVersion)
- [ ] `packages/shared/src/db/schema/projects.ts` — projects (id, slug, title, description, vertical, ownerId, isPublic)
- [ ] `packages/shared/src/db/schema/project-members.ts` — project_members (userId, projectId, role)
- [ ] `packages/shared/src/db/schema/pages.ts` — pages (id, projectId, slug, title, contentBlocks JSONB, renderData JSONB)
- [ ] `packages/shared/src/db/schema/memories.ts` — memories (id, projectId, userId, level, key, value JSONB, embedding vector(1536))
- [ ] `packages/shared/src/db/schema/preferences.ts` — preferences (id, userId, category, key, value, confidence, source)
- [ ] `packages/shared/src/db/schema/agent-connections.ts` — agent_connections (id, userId, projectId, provider, apiKeyHash, status)
- [ ] Re-export all tables from `schema/index.ts`
- [ ] `apps/web/drizzle.config.ts` — Drizzle config
- [ ] `npx drizzle-kit push` — apply schema to local DB
- [ ] `npx drizzle-kit studio` — verify tables are created

### 2.2 Database Module (NestJS)
- [ ] `DatabaseModule` — global provider, Drizzle instance
- [ ] `database.types.ts` — `DrizzleDB` type
- [ ] Verify connection to postgres from API

### 2.3 Redis Module (NestJS)
- [ ] `RedisModule` — ioredis provider
- [ ] Pub/sub for cross-service communication
- [ ] Verify connection

### 2.4 Auth — Magic Link
- [ ] `POST /api/v1/auth/send-magic-link` — generates a 6-digit PIN, sends via Resend
- [ ] `POST /api/v1/auth/verify` — verifies PIN, returns JWT pair
- [ ] `POST /api/v1/auth/refresh` — refreshes access token via refresh cookie
- [ ] `POST /api/v1/auth/logout` — invalidates refresh token (tokenVersion++)
- [ ] `JwtAuthGuard` — global guard, verifies Bearer token
- [ ] `@Public()` decorator — skips guard for public endpoints
- [ ] `@CurrentUser()` decorator — injects current user

### 2.5 Auth — Frontend
- [ ] `AuthProvider` + `useAuth()` hook
- [ ] Login page (`/login`) — email → PIN form
- [ ] Middleware — redirects unauthorized users
- [ ] Auto-refresh on 401
- [ ] `api client` — fetch wrapper with JWT auto-refresh

### 2.6 Phase 2 Deploy
- [ ] Push → auto-deploy with migrations
- [ ] Verify: registration → PIN to email → login → token

**Phase 2 result:** Users can register and log in. DB has core schema. Auth works end-to-end.

---

## Phase 3: Core Features (projects + memory)

### 3.1 Projects CRUD
- [ ] `ProjectsModule` (NestJS) — CRUD endpoints
- [ ] `ProjectMemberGuard` — membership check via `x-project-id`
- [ ] `@ProjectId()` decorator
- [ ] Creating a project → automatically becomes owner
- [ ] Inviting members (by email, generating invite link)
- [ ] Frontend: project creation page, project list, project page

### 3.2 Memory CRUD (3 levels)
- [ ] `MemoryModule` (NestJS):
  - `POST /api/v1/memories` — create (with level check)
  - `GET /api/v1/memories` — read (filter by level, access by permissions)
  - `PATCH /api/v1/memories/:id` — update
  - `DELETE /api/v1/memories/:id` — delete
  - `POST /api/v1/memories/search` — semantic search (pgvector cosine similarity)
- [ ] Private memory — visible only to the userId-owner
- [ ] Project memory — visible to all project members
- [ ] Public memory — visible to everyone via link
- [ ] Embedding generation — API call (OpenAI/Anthropic) for vectorization
- [ ] Frontend: memory management UI within the project

### 3.3 Pages
- [ ] `PagesModule` (NestJS):
  - CRUD for project pages
  - Content — array of blocks (JSONB)
  - Dual rendering: human mode / agent mode
- [ ] Frontend: page viewer, basic editor

### 3.4 Preferences
- [ ] `PreferencesModule` (NestJS):
  - CRUD for user preferences
  - Categories: travel, food, budget, schedule, accessibility
  - Confidence score (explicit > inferred > agent)
- [ ] Frontend: preferences setup page (onboarding wizard)

### 3.5 Socket.io — Realtime
- [ ] `SocketModule` (NestJS) — WebSocketGateway
- [ ] Auth via JWT during handshake
- [ ] Rooms: `project:{id}`, `page:{id}`
- [ ] Events: memory CRUD, page updates, member join/leave
- [ ] Frontend: `useSocketRoom` hook, real-time updates

### 3.6 Phase 3 Deploy
- [ ] Push → auto-deploy
- [ ] E2E test: create project → add member → write memory → see it in realtime

**Phase 3 result:** Users create projects, invite people, read/write memory at 3 levels, pages update in realtime.

---

## Phase 4: MCP Integration (agents)

### 4.1 Agent API Keys
- [ ] API key generation in project settings (UI)
- [ ] Key hashing (bcrypt/argon2) on save
- [ ] Key validation in MCP server
- [ ] Rate limiting per API key (Redis-based)
- [ ] Audit log for all agent operations

### 4.2 MCP Tools Implementation
- [ ] `lk_memory_read` — read memory (private: own only, project: if member)
- [ ] `lk_memory_write` — write to memory (level check + permission check)
- [ ] `lk_memory_search` — semantic search across project memory
- [ ] `page_get` — get page in agent-friendly format
- [ ] `page_suggest` — suggest a page change (creates a suggestion, does not apply)
- [ ] `preferences_get` — get current user's preferences
- [ ] `preferences_set` — set a preference on behalf of the user
- [ ] `project_info` — project information
- [ ] `project_members` — list of members

### 4.3 MCP ↔ API Communication
- [ ] Redis pub/sub for events between MCP and API
- [ ] When an agent writes memory → event to Redis → API receives → Socket.io broadcast → frontend updates
- [ ] When a user changes memory on the frontend → event → MCP receives → notifies connected agents

### 4.4 Agent Connection UI
- [ ] "Connect an agent" page in project settings
- [ ] Instructions for Claude: json-config for MCP
- [ ] Instructions for ChatGPT: Custom GPT action schema
- [ ] Connected agents status (online/offline)
- [ ] Log of recent agent operations

### 4.5 Built-in Agent (default)
- [ ] When creating a project — built-in agent is automatically connected
- [ ] Simple AI assistant (Claude API / OpenAI API) for basic tasks
- [ ] Can read/write memory, suggest content for pages
- [ ] Chat interface within the project

### 4.6 MCP Testing
- [ ] Connect Claude Desktop to the MCP server (stdio transport via proxy or SSE)
- [ ] Test: Claude reads project memory → suggests content → writes result
- [ ] Test: two agents (Claude + ChatGPT) connected to the same project

**Phase 4 result:** Agents connect to projects via MCP, read/write memory, suggest content. Built-in agent works out of the box.

---

## Phase 5: Travel Vertical (MVP)

### 5.1 Travel-specific Schema
- [ ] Extend preferences: destinations, budget_per_night, food_restrictions, activity_types, pace, accommodation_type
- [ ] Travel-specific page blocks: map, itinerary, accommodation, restaurant, activity
- [ ] Structured data for agents: GeoJSON, datetime ranges, price ranges

### 5.2 Travel Page Generator
- [ ] Generate travel page from memory + preferences of all members
- [ ] Map with route (Mapbox / Leaflet)
- [ ] Day-by-day itinerary
- [ ] Recommendations: hotels, restaurants, activities
- [ ] Dual rendering: beautiful UI for humans + structured data for agents

### 5.3 Preference Negotiation
- [ ] `NegotiationModule` (NestJS):
  - Conflict detection (Alice: hiking vs Bob: clubs)
  - LLM-powered compromise generation
  - UI: proposal cards with accept/reject
  - Realtime updates via Socket.io
- [ ] Constraint satisfaction: time of day, geography, budget
- [ ] Negotiation result → written to project memory

### 5.4 Sharing
- [ ] Public page via link (`loomknot.com/p/{slug}`)
- [ ] OG meta tags for attractive previews in messengers
- [ ] QR code for sharing

### 5.5 Onboarding Flow
- [ ] Registration → "Tell us about your preferences" (wizard 3-5 steps)
- [ ] Or: "Connect your AI agent, it already knows your preferences"
- [ ] Create your first project → invite friends → see how the page adapts

### 5.6 Wow Moment (first 30 seconds)
- [ ] New member opens a link to a friend's project
- [ ] Agent instantly sees: out of 5 restaurants, 2 suit you (vegetarian)
- [ ] Suggests replacements for the other 3
- [ ] All without a single click — the magic of persistent memory + multi-agent

**Phase 5 result:** Working MVP for travel. Users create a trip, invite friends, agents suggest a route based on everyone's preferences, negotiation resolves conflicts.

---

## Phase 6: Polish + Launch

### 6.1 Security Audit
- [ ] Penetration test on MCP endpoints
- [ ] Verify private memory isolation (no leaks between users)
- [ ] Rate limiting on all public endpoints
- [ ] CORS policy
- [ ] CSP headers
- [ ] API key rotation mechanism

### 6.2 Monitoring
- [ ] Sentry — error tracking (web + api + mcp)
- [ ] Pino structured logging → centralized logs
- [ ] Health dashboard (Uptime Kuma or equivalent)
- [ ] Telegram alerts on downtime

### 6.3 Performance
- [ ] Redis caching for hot paths (page rendering, memory reads)
- [ ] pgvector index (IVFFlat or HNSW) for fast semantic search
- [ ] Next.js ISR for public pages
- [ ] Image optimization (MinIO + sharp)
- [ ] Bundle analysis (web)

### 6.4 Landing Page
- [ ] Home page loomknot.com — pitch + demo
- [ ] Video/gif demonstration of the wow moment
- [ ] CTA: "Create your first trip"
- [ ] SEO basics

### 6.5 Beta Launch
- [ ] Closed beta (invite-only, 50-100 users)
- [ ] In-app feedback form
- [ ] Analytics (PostHog / Plausible)
- [ ] Iteration based on feedback

### 6.6 Public Launch
- [ ] Product Hunt
- [ ] Hacker News (Show HN)
- [ ] Twitter/X thread
- [ ] Reddit (r/travel, r/artificial)
- [ ] Open registration

**Phase 6 result:** Product is in production, monitoring is operational, first users onboarded.

---

## Phase 7: Scaling (post-launch)

### 7.1 New Verticals
- [ ] Weddings — bride/groom/parents preferences
- [ ] Renovation — designer/client/contractor
- [ ] Study groups — adaptive learning material
- [ ] Corporate events

### 7.2 Infrastructure
- [ ] Horizontal scaling: add worker nodes to Swarm
- [ ] Replica set for PostgreSQL (read replicas)
- [ ] Redis Sentinel / Cluster
- [ ] CDN for static assets (Cloudflare)
- [ ] Dedicated server for MCP (as agent traffic grows)

### 7.3 Features
- [ ] OAuth (Google, GitHub, Apple)
- [ ] Mobile app (React Native / PWA)
- [ ] Webhook integrations (Zapier, n8n)
- [ ] Public API for third-party developers
- [ ] MCP tools marketplace
- [ ] WebMCP support (Chrome extension)

### 7.4 Monetization
- [ ] Free tier: 1 project, 3 members, built-in agent
- [ ] Pro: unlimited projects, bring-your-own-agent, priority negotiation
- [ ] Team: extended permissions, audit log, SSO
- [ ] Stripe integration

---

## Dependencies Between Phases

```
Phase 0 (Infrastructure)
  └── Phase 1 (Skeleton)
        └── Phase 2 (Data + Auth)
              ├── Phase 3 (Core Features)
              │     ├── Phase 4 (MCP Integration)
              │     │     └── Phase 5 (Travel MVP)
              │     │           └── Phase 6 (Launch)
              │     │                 └── Phase 7 (Scale)
              │     └── Phase 4 (in parallel with core)
              └── Phase 3 (immediately after auth)
```

Phases 3 and 4 can be worked on in parallel: one developer handles core features while another works on MCP integration.
