# Loomknot MCP Tools — Specification

One API key = one user = access to all user's projects, tasks, and memories.
The AI connects once and receives the user's full workspace.

---

## 0. Bootstrap

### `lk_bootstrap`
**First call after connection.** Returns everything AI needs to start working: user info, all projects with summaries (for routing), and pending tasks.

```
Params: —

Returns: {
  user: { id, name, email }
  projects: Array<{
    id, title, summary, vertical, memberCount, memoryCount, updatedAt
  }>
  pendingTasks: Task[]
}
```

AI uses this to:
1. Understand user's world (project list + summaries)
2. Route user messages to the right project (by matching message to summaries)
3. Pick up pending tasks immediately

---

## 1. Projects

### `lk_projects_list`
All user's projects with summaries for routing.

```
Params: —

Returns: Array<{
  id, title, summary, vertical, isPublic, memberCount, memoryCount, updatedAt
}>
```

### `lk_projects_get`
Project details including full context.md — the main document AI reads before answering.

```
Params:
  projectId: string

Returns: Project & {
  context: string              — full context.md (markdown, auto-generated)
  summary: string              — one paragraph for routing
  members: Member[]
  pageCount: number
  memoryCount: number
}
```

### `lk_projects_create`
Create a new project. AI can create projects autonomously.

```
Params:
  title: string
  description?: string
  vertical?: string            — travel, health, finance, education, general...

Returns: Project
Side effects:
  → INSERT projects
  → INSERT project_members (role: owner)
  → INSERT activity_log
```

### `lk_projects_update`
Update project settings.

```
Params:
  projectId: string
  title?: string
  description?: string
  isPublic?: boolean
  settings?: Record<string, unknown>

Returns: Project
Side effects:
  → Regenerate summary (if title or description changed)
  → INSERT activity_log
```

### `lk_projects_delete`
Soft-delete a project. Only the project owner can delete it.

```
Params:
  projectId: string

Returns: { deleted: true, projectId }
Side effects:
  → UPDATE projects.deletedAt
  → INSERT activity_log
```

---

## 2. Memory

### `lk_memory_write`
Save a fact, decision, or preference to project memory.

```
Params:
  projectId: string
  category: string             — health, food, accommodation, finance, decision...
  key: string                  — medication_list, dietary_restriction, hotel_choice...
  value: any                   — structured data (JSON)
  summary?: string             — human-readable description
  level?: private | project    — default: private

Returns: Memory
Side effects:
  → INSERT memories (or UPSERT by projectId + category + key)
  → Regenerate project context.md and summary (async)
  → Socket.io → MEMORY_CREATED
  → INSERT activity_log
```

### `lk_memory_bulk-write`
Save multiple memories at once. For parsing documents, importing data, or saving multiple facts from a conversation.

```
Params:
  projectId: string
  items: Array<{
    category: string
    key: string
    value: any
    summary?: string
    level?: private | project
  }>

Returns: Memory[]
Side effects:
  → INSERT memories × N
  → Regenerate context.md once (not per item)
  → Socket.io → MEMORY_CREATED
  → INSERT activity_log
```

### `lk_memory_read`
Read project memories with filtering and pagination.

```
Params:
  projectId: string
  category?: string            — filter by category
  level?: private | project | public
  limit?: number               — default 50, max 200
  cursor?: string              — pagination cursor (memory id)

Returns: {
  items: Memory[]
  nextCursor?: string          — null if no more results
  total: number
}
Access:
  → private — own only
  → project — if project member
  → public — everyone
```

### `lk_memory_search`
Search memories across one or all user's projects. Text-based matching by category, key, summary, and value fields.

```
Params:
  query: string                — "medications I take", "vacation budget"
  projectId?: string           — limit to one project (optional, searches all if omitted)
  category?: string
  limit?: number               — default 10

Returns: Array<Memory & {
  projectId: string
  projectTitle: string
}>

Implementation:
  → Text search across summary + key + category fields
  → Filter by userId (private) or project membership (project-level)
  → Ordered by relevance (match quality) then updatedAt
```

### `lk_memory_update`
Update an existing memory record.

```
Params:
  memoryId: string
  value?: any
  summary?: string
  level?: private | project | public

Returns: Memory
Side effects:
  → Regenerate project context.md and summary (async)
  → Socket.io → MEMORY_UPDATED
  → INSERT activity_log
```

### `lk_memory_delete`
Delete a memory record.

```
Params:
  memoryId: string

Returns: { deleted: true }
Side effects:
  → Regenerate project context.md and summary (async)
  → Socket.io → MEMORY_DELETED
  → INSERT activity_log
```

---

## 3. Pages

### `lk_pages_list`
List project pages (metadata only, no blocks). The page with slug `index` is
the project main page; other pages are child/detail pages.

```
Params:
  projectId: string

Returns: Array<{
  id, slug, title, status, sortOrder, updatedAt
}>
```

### `lk_pages_get`
Full page with all blocks.

```
Params:
  pageId: string

Returns: Page & { blocks: PageBlock[] }
```

### `lk_pages_create`
Create a child page with blocks. AI can build full pages: itineraries,
comparisons, maps.

Agent invariant: after creating a child page, update the `index` page so the
project main page summarizes the change and links to the new page. Do not call
`lk_pages_create` with slug `index`; edit the existing index page with
`lk_pages_update`.

```
Params:
  projectId: string
  title: string
  slug?: string                — auto-generate from title if not provided
  blocks: Array<{
    type: string               — text, map, itinerary, place, budget, gallery...
    content: any               — block data (JSONB)
    agentData?: any            — machine-readable structured data
    sourceMemoryIds?: string[] — which memories this block was built from
  }>

Returns: Page & { blocks: PageBlock[] }
Side effects:
  → INSERT pages
  → INSERT page_blocks × N
  → Socket.io → PAGE_CREATED
  → INSERT activity_log
```

### `lk_pages_update`
Update page title or specific blocks. Can add, update, or remove blocks.

Agent invariant: after updating a child page, update the `index` page when the
change affects the project summary, navigation, decisions, itinerary, budget,
places, or current status.

```
Params:
  pageId: string
  title?: string
  blocks?: Array<{
    id?: string                — if present → update existing block
    action?: "delete"          — if set → remove this block
    type?: string
    content?: any
    agentData?: any
    sourceMemoryIds?: string[]
  }>

Returns: Page & { blocks: PageBlock[] }
Side effects:
  → Socket.io → PAGE_UPDATED
  → INSERT activity_log
```

### `lk_pages_delete`
Delete a page and all its blocks.

```
Params:
  pageId: string

Returns: { deleted: true }
Side effects:
  → CASCADE delete page_blocks
  → Socket.io → PAGE_DELETED
  → INSERT activity_log
```

---

## 4. Tasks (CRM for AI)

**Central feature, not scoped to a project.** The user assigns work to their AI. AI picks up tasks, executes them, reports progress. The user sees everything in a dashboard.

Tasks live outside projects — a task can reference a project, span multiple projects, or be project-independent.

### `lk_tasks_list`
List tasks for the AI. On every connection, AI should check for pending tasks.

```
Params:
  status?: pending | in_progress | done | failed
  projectId?: string           — filter by project (optional)
  limit?: number               — default 20
  cursor?: string

Returns: {
  items: Task[]
  nextCursor?: string
}
```

### `lk_tasks_get`
Task details with execution logs.

```
Params:
  taskId: string

Returns: Task & { logs: TaskLog[] }
```

### `lk_tasks_update`
AI updates task status and writes progress logs.

```
Params:
  taskId: string
  status?: pending | in_progress | done | failed
  result?: any                 — execution result (JSON)
  log?: string                 — progress message ("Found 3 hotels, saved to memory")

Returns: Task
Side effects:
  → INSERT task_logs (if log provided)
  → UPDATE tasks.completedAt (if status = done)
  → Socket.io → TASK_UPDATED (realtime UI update)
  → INSERT activity_log
```

### `lk_tasks_create`
AI can create tasks for itself — scheduled work, reminders, follow-ups.

```
Params:
  title: string
  prompt: string               — full prompt describing what to do
  projectId?: string           — optional project binding
  priority?: low | normal | high | urgent    — default: normal
  scheduledAt?: string         — ISO datetime for deferred execution

Returns: Task
Side effects:
  → INSERT tasks
  → Socket.io → TASK_CREATED
```

### How Tasks Work

**User creates a task via UI:**
```
Title: "Find hotels in Barcelona"
Prompt: "Find 5 hotels in Barcelona for March 15-22, 2026.
  Consider my preferences from this project.
  Budget up to 150€/night, quiet area.
  Save options to project memory.
  Create a comparison page."
Project: Barcelona 2026
Priority: high
```

**AI on connection:**
```
1. lk_bootstrap → sees pendingTasks
2. lk_tasks_update(taskId, status: "in_progress", log: "Starting hotel search")
3. lk_projects_get(projectId) → reads context.md → knows budget, dates, preferences
4. Searches for hotels (AI knowledge or external tools)
5. lk_memory_bulk-write(projectId, hotel options × 5)
6. lk_pages_create(projectId, comparison page with place + budget blocks)
7. lk_tasks_update(taskId, status: "done",
     result: { hotelsFound: 5, pageCreated: "hotel-comparison" },
     log: "Found 5 hotels within budget. Created comparison page.")
```

**AI creates a follow-up task for itself:**
```
lk_tasks_create(
  title: "Recheck Barcelona hotel prices",
  prompt: "Check if Hotel Arts price changed. Update memory if so.",
  projectId: "...",
  scheduledAt: "2026-03-10T09:00:00Z"
)
```

**User sees in dashboard:**
```
✅ Find hotels in Barcelona            done    2m ago
   Found 5 hotels. Created comparison page.
   → Open page

🔄 Monitor flight prices              running
   Last check: 1h ago, price unchanged.
   Current best: 14,500₽ (Aeroflot)

⏳ Recheck hotel prices               scheduled Mar 10
   Created by AI
```

---

## 5. Negotiations (group projects)

### `lk_negotiations_list`
Active and resolved conflicts in a project.

```
Params:
  projectId: string
  status?: open | resolved | dismissed

Returns: Negotiation[]
```

### `lk_negotiations_get`
Full negotiation details: conflict data, options, votes.

```
Params:
  negotiationId: string

Returns: Negotiation & {
  options: Array<NegotiationOption & {
    votes: NegotiationVote[]
  }>
}
```

### `lk_negotiations_propose`
An agent proposes a compromise option.

```
Params:
  negotiationId: string
  title: string
  description: string
  proposedValue: any
  reasoning: string            — why this option is a good compromise

Returns: NegotiationOption
Side effects:
  → INSERT negotiation_options
  → Socket.io → NEGOTIATION_PROPOSAL
  → INSERT activity_log
```

---

## 6. Activity

### `lk_activity_recent`
Recent changes in a project. AI can check "what happened since last visit".

```
Params:
  projectId: string
  since?: string               — ISO datetime (default: last 24 hours)
  limit?: number               — default 20

Returns: Array<{
  action: string               — memory.create, page.update, task.done, negotiation.resolved...
  targetType: string           — memory, page, task, negotiation
  targetId: string
  userId?: string
  userName?: string
  metadata: any
  createdAt: string
}>
```

---

## Summary

| Group | Tools | Count |
|-------|-------|-------|
| Bootstrap | `lk_bootstrap` | 1 |
| Projects | `lk_projects_list`, `lk_projects_get`, `lk_projects_create`, `lk_projects_update`, `lk_projects_delete` | 5 |
| Memory | `lk_memory_write`, `lk_memory_bulk-write`, `lk_memory_read`, `lk_memory_search`, `lk_memory_update`, `lk_memory_delete` | 6 |
| Pages | `lk_pages_list`, `lk_pages_get`, `lk_pages_create`, `lk_pages_update`, `lk_pages_delete` | 5 |
| Tasks | `lk_tasks_list`, `lk_tasks_get`, `lk_tasks_update`, `lk_tasks_create` | 4 |
| Negotiations | `lk_negotiations_list`, `lk_negotiations_get`, `lk_negotiations_propose` | 3 |
| Activity | `lk_activity_recent` | 1 |
| **Total** | | **25** |

---

## AI Connection Lifecycle

```
AI connects via MCP (API key in Authorization header)
  │
  ▼
1. lk_bootstrap
   → Get user info, all projects (with summaries), pending tasks
   │
   ├── Has pending tasks?
   │   → Pick up and execute (lk_tasks_update → work → lk_tasks_update)
   │
   └── User sends a message?
       │
       ▼
2. Route to project
   → Match message against project summaries (from lk_bootstrap)
   → High confidence → auto-select
   → Low confidence → ask user
   → No match → offer to create new project
   │
   ▼
3. Load project context
   → lk_projects_get(projectId) → read context.md
   │
   ▼
4. Work within project
   → lk_memory_read, lk_memory_write — read/save facts
   → lk_pages_create, lk_pages_update — build visual output
   → lk_memory_search — cross-project lookup if needed
   │
   ▼
5. After changes
   → context.md regenerated automatically (server-side, async)
   → summary updated (for future routing)
   → Socket.io events → UI updates in realtime
```

---

## Error Handling

All tools return errors in a standard format:

```
Error response:
{
  error: {
    code: string               — NOT_FOUND, FORBIDDEN, VALIDATION, RATE_LIMITED, INTERNAL
    message: string            — human-readable error description
  }
}

Common errors:
  NOT_FOUND       — project/memory/page/task does not exist
  FORBIDDEN       — no access (not a project member, or private memory of another user)
  VALIDATION      — invalid params (missing required field, wrong type)
  RATE_LIMITED    — too many requests (per API key, per minute)
  INTERNAL        — server error (retry later)
```

---

## Changes from Previous Version

| Removed | Reason |
|---------|--------|
| `preferences_get`, `preferences_set` | Everything is memories inside projects |
| pgvector / embedding references | Routing via LLM + summaries, not vector search |

| Added | Purpose |
|-------|---------|
| `lk_bootstrap` | Single call to initialize AI session |
| `lk_memory_bulk-write` | Write multiple memories in one call |
| `lk_memory_read` pagination (cursor) | Handle projects with many memories |
| `lk_memory_search` text-based | Search without pgvector |
| `lk_pages_delete` | AI can clean up pages |
| `lk_tasks_create` | AI creates follow-up tasks for itself |
| `lk_negotiations_get` | View negotiation details with options and votes |
| `lk_activity_recent` | AI knows what changed since last visit |
| Error schema | Standard error format for all tools |
