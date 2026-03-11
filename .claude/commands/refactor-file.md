# Refactor File

Refactor the file: $ARGUMENTS

You are a senior fullstack developer. Refactor the specified file according to the Loomknot project architecture.

## Process

### 1. Analyze (DO NOT edit yet)
- Read the entire file
- Determine **app**: `apps/web`, `apps/api`, `apps/mcp`, or `packages/shared`
- Determine file type (see tables below)
- Count lines and identify problems:
  - File > 450 lines
  - Functions > 50 lines
  - **Frontend**: > 5 useState, > 3 useEffect, JSX > 150 lines
  - **Backend**: controller contains business logic, service contains raw SQL
  - Mixed responsibilities

### 2. Refactoring Plan
Show the user what you plan to do before making changes.

### 3. Execute
Split the file according to the rules for the corresponding app.

---

## Frontend (`apps/web`) — Next.js 15 App Router

**Feature structure:**
```
app/[locale]/app/{feature}/
  page.tsx              # Server Component (data fetching, layout)
  components/           # Client components ('use client')
  hooks/                # Custom hooks with logic

# Shared components:
components/{feature}/
  {Feature}.tsx         # Main component
  {feature}.types.ts    # interfaces, types
  hooks/                # Feature hooks
```

**Checks:**
- [ ] Server Components by default, `'use client'` only when needed
- [ ] TanStack Query for all server state — never `useState` for server data
- [ ] Zustand for shared UI state only
- [ ] `invalidateQueries` after every mutation
- [ ] No direct fetch — only through hooks (`useQuery`, `useMutation`)
- [ ] Tailwind CSS 4 + shadcn/ui — no hardcoded colors
- [ ] Lucide React for icons
- [ ] Types from `@loomknot/shared` — no duplicates

---

## Backend (`apps/api`) — NestJS 11 + Fastify

**Module structure:**
```
src/{feature}/
  {feature}.module.ts      # NestJS module
  {feature}.controller.ts  # HTTP handlers (thin!)
  {feature}.service.ts     # Business logic
  dto/                     # DTOs with Zod validation
```

**Layer rules:**
| Layer | Can call | CANNOT call |
|-------|----------|-------------|
| Controller | Service | DB directly |
| Service | Other Services, Drizzle queries | Controller |
| Guard | Service | Controller |

**Checks:**
- [ ] Pino logger, NOT `console.log`
- [ ] Controller does NOT contain business logic
- [ ] `JwtAuthGuard` + `ProjectMemberGuard` on all endpoints (or `@Public()`)
- [ ] `@CurrentUser()`, `@ProjectId()` decorators for context
- [ ] Socket.io events emitted after mutations
- [ ] Drizzle query builder — no raw SQL (except complex JOIN/subquery)
- [ ] Always filter by `projectId` in project-scoped queries
- [ ] Transactions for mutations with side effects
- [ ] Zod for input validation

---

## MCP Server (`apps/mcp`)

**Checks:**
- [ ] API key validated before every operation
- [ ] Operations scoped by user permissions in project
- [ ] Rate limiting on agent requests
- [ ] Private memory never exposed to other agents/users
- [ ] All agent operations logged for audit

---

## Shared Package (`packages/shared`)

**Checks:**
- [ ] Types use `$inferSelect` / `$inferInsert` from Drizzle schema
- [ ] Schema is the single source of truth
- [ ] `BLOCK_TYPES` constants for block type references
- [ ] No app-specific logic — only types, constants, schemas

---

## Naming Conventions (all apps)

| Suffix | Purpose | Dependencies |
|--------|---------|-------------|
| `*.types.ts` | interfaces, types, DTOs, enums | None |
| `*.constants.ts` | constants, configs | None |
| `*.utils.ts` / `*.helper.ts` | pure functions | Only types/constants |
| `*.service.ts` | business logic | Can use everything |
| `*.controller.ts` | HTTP handlers | Only Service |
| `*.tsx` | React components | — |

---

## Important

- **DO NOT add** extra features, comments, or docstrings
- **DO NOT touch** code unrelated to the refactoring
- **PRESERVE** all existing functionality
- After refactoring — verify imports work
- Run `pnpm build` to check
- If block types are involved — check AiTML spec sync (CLAUDE.md rule 9)
