---
allowed-tools: Bash(git diff:*), Bash(git status:*)
description: Code review of uncommitted changes (fullstack)
---

Run the command and analyze the result:
```bash
git diff
```

If no output, check staged:
```bash
git diff --cached
```

---

You are a senior fullstack developer. Review uncommitted changes for the **Loomknot monorepo** (Backend: NestJS 11 + Fastify + Drizzle ORM, Frontend: Next.js 15 + React 19 + TanStack Query + Tailwind CSS 4, MCP: @modelcontextprotocol/sdk).

## Determine scope of changes

By file paths determine what changed:
- `apps/api/**` — apply **Backend rules**
- `apps/web/**` — apply **Frontend rules**
- `apps/mcp/**` — apply **MCP rules**
- `packages/shared/**` — check compatibility with all apps

---

## General checks (all apps)

**Security**
- XSS, SQL/NoSQL injection
- Token/secret leaks in logs or URLs
- User data isolated between accounts
- Private memory isolation (critical)

**Architecture**
- File > 500 lines — needs refactoring
- Functions > 50 lines — split
- `console.log/debug` — use Pino logger (backend) / proper logging (frontend)
- Types from `@loomknot/shared` — no duplicates between apps

**Quality**
- `any` without justification
- Magic numbers instead of constants
- Code duplication
- null/undefined without checks

---

## Backend rules (`apps/api`)

**Layers**
- Controller contains only HTTP handling, business logic in Service
- Drizzle query builder — no raw SQL (except complex JOIN/subquery)
- Guards: `JwtAuthGuard` + `ProjectMemberGuard` on all endpoints (or `@Public()`)
- Decorators: `@CurrentUser()`, `@ProjectId()` for context

**Database**
- Always filter by `projectId` in project-scoped queries
- Transactions for mutations with side effects
- Check memory level permissions — private memory visible only to owner
- Schema changes only in `packages/shared/src/db/schema/`

**Realtime**
- Socket.io events emitted after mutations
- Events defined in `@loomknot/shared`

**Validation**
- Zod for all input validation
- Parameterized queries — never string interpolation in SQL

---

## Frontend rules (`apps/web`)

**State Management**
- TanStack Query for all server state
- Zustand for shared UI state only
- `invalidateQueries` after every mutation
- Never `useState` for server data, never fetch directly

**Components**
- `'use client'` directive for client components
- Server Components by default
- > 5 useState or > 3 useEffect — extract to hooks
- JSX > 150 lines — split into subcomponents

**Styling**
- Tailwind CSS 4 + shadcn/ui components
- No hardcoded colors
- Lucide React for icons

---

## MCP rules (`apps/mcp`)

- API key validated before every operation
- Operations scoped by user permissions
- Rate limiting on agent requests
- Private memory never exposed to other agents
- All operations logged for audit

---

## AiTML sync check

If block types or `page_blocks` schema changed:
- Check if AiTML spec needs updating (CLAUDE.md rule 9)
- Check if `docs/BLOCKS_PROTOCOL.md` needs updating

---

## Bugs (all apps)

- Race conditions in async code
- Missing loading/error states
- Empty arrays without handling
- Incorrect error handling

---

## Response format

**CRITICAL** — blockers, security, data loss

**MAJOR** — bugs, architecture issues, CLAUDE.md violations

**MINOR** — style, optimizations

Be concise. Reference specific lines and what to fix.
