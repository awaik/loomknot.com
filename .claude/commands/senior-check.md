---
description: Check if the solution meets senior-level quality
---

You are a senior fullstack developer. Review what you did before this — is it a senior solution or a hack?

## Process

### 1. Find changed files
```bash
git diff --name-only HEAD~1
```
Or if not committed:
```bash
git diff --name-only
```

### 2. Read the changed code
Study each file, understanding the context of changes.

### 3. Evaluate against criteria

---

## Senior solution checklist

**Architecture**
- [ ] Follows NestJS module pattern: Controller → Service → Drizzle (backend)
- [ ] Follows separation: Server Component → Client Component → Hook → API (frontend)
- [ ] One file = one responsibility
- [ ] Files < 500 lines, functions < 50 lines
- [ ] Changes are minimal and focused (no over-engineering)

**Reliability**
- [ ] Error handling at all levels
- [ ] Loading/error states for async operations
- [ ] null/undefined checks where needed
- [ ] No race conditions

**Maintainability**
- [ ] Code is readable without comments
- [ ] No magic numbers — constants used
- [ ] No code duplication
- [ ] Proper types instead of `any`
- [ ] Types from `@loomknot/shared` — not duplicated

**Loomknot project standards**
- [ ] Pino logger instead of console.log (backend)
- [ ] `JwtAuthGuard` + `ProjectMemberGuard` on endpoints (or `@Public()`)
- [ ] `@CurrentUser()`, `@ProjectId()` decorators
- [ ] TanStack Query for server state (frontend)
- [ ] `'use client'` on client components
- [ ] `invalidateQueries` after mutations
- [ ] Socket.io events after mutations
- [ ] Always filter by `projectId` in project-scoped queries
- [ ] Zod for input validation
- [ ] `BLOCK_TYPES` constants for block references

**Security**
- [ ] No API keys exposed in client code
- [ ] Private memory isolation maintained
- [ ] Parameterized queries — no string interpolation in SQL

**AiTML sync** (if blocks changed)
- [ ] AiTML spec updated (all representations)
- [ ] `BLOCKS_PROTOCOL.md` updated
- [ ] AiTML `CHANGELOG.md` updated

---

## Signs of a hack

- Quick fix that will cause problems later
- Duplication instead of reuse
- Ignoring project architecture
- Hardcoded values instead of configuration
- Missing error handling
- `any` where types are possible
- Too many changes for a simple task
- Comments like "TODO: fix later"
- Fallbacks or workarounds instead of clean solutions

---

## Response format

### Verdict: Senior / Needs improvement / Hack

**What's good:**
- ...

**What to improve:**
- ...

**Fix plan (if needed):**
1. ...
2. ...

---

Investigate thoroughly, analyze, and report. Do not modify code without a request — first show the plan or confirm the solution is correct.
