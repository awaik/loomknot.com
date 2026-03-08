# Loomknot MCP Tools — Specification

One API key = one user = access to all their projects + tasks + preferences.
The AI is linked once and receives the user's personal storage.

---

## 1. Projects

### `projects/list`
List of all user's projects.

```
Params: —
Returns: Project[]
```

### `projects/get`
Project details: settings, members, stats.

```
Params:
  projectId: string

Returns: Project & { members: Member[], pageCount: number, memoryCount: number }
```

### `projects/create`
Create a new project. The AI can create projects on its own.

```
Params:
  title: string
  description?: string
  vertical?: string          — travel, health, finance, education, general...

Returns: Project
Side effects:
  → INSERT projects
  → INSERT project_members (role: owner)
  → INSERT activity_log
```

### `projects/update`
Update a project.

```
Params:
  projectId: string
  title?: string
  description?: string
  isPublic?: boolean
  settings?: Record<string, unknown>

Returns: Project
```

---

## 2. Memory

### `memory/write`
Write data to project memory.

```
Params:
  projectId: string
  category: string           — health, food, accommodation, finance, decision...
  key: string                — medication_list, dietary_restriction, hotel_choice...
  value: any                 — structured data (JSON)
  summary?: string           — human-readable description
  level?: private | project  — default: private for personal, project for group

Returns: Memory
Side effects:
  → INSERT memories
  → Generate embedding (async)
  → Socket.io → MEMORY_CREATED
  → INSERT activity_log
```

### `memory/read`
Read project memory with filtering.

```
Params:
  projectId: string
  category?: string          — filter by category
  level?: private | project | public
  limit?: number             — default 50

Returns: Memory[]
Access:
  → private — own only
  → project — if project member
  → public — everyone
```

### `memory/search`
**Semantic search across ALL user's projects.** Key tool.

```
Params:
  query: string              — "medications I take", "vacation budget"
  projectId?: string         — limit to one project (optional)
  category?: string
  limit?: number             — default 10

Returns: (Memory & { projectTitle: string, score: number })[]
Implementation:
  → Embed query → pgvector cosine similarity
  → Searches across ALL projects where userId = current user
  → Returns with project title and relevance score
```

### `memory/update`
Update an existing record.

```
Params:
  memoryId: string
  value?: any
  summary?: string
  level?: private | project | public

Returns: Memory
Side effects:
  → Re-generate embedding (if value changed)
  → Socket.io → MEMORY_UPDATED
```

### `memory/delete`
Delete a memory record.

```
Params:
  memoryId: string

Returns: { deleted: true }
Side effects:
  → Socket.io → MEMORY_DELETED
```

---

## 3. Pages

### `pages/list`
List of project pages.

```
Params:
  projectId: string

Returns: Page[] (without blocks, metadata only)
```

### `pages/get`
Page content with blocks.

```
Params:
  pageId: string

Returns: Page & { blocks: PageBlock[] }
```

### `pages/create`
Create a page with blocks. The AI can create full-featured pages.

```
Params:
  projectId: string
  title: string
  slug?: string              — auto-generate if not provided
  blocks: Array<{
    type: string             — text, map, itinerary, place, budget, gallery...
    content: any             — block data
    agentData?: any          — machine-readable data
    sourceMemoryIds?: string[]
  }>

Returns: Page & { blocks: PageBlock[] }
Side effects:
  → INSERT pages
  → INSERT page_blocks × N
  → Socket.io → PAGE_UPDATED
```

### `pages/update`
Update a page: replace/add/remove blocks.

```
Params:
  pageId: string
  title?: string
  blocks?: Array<{
    id?: string              — if present, update existing
    type: string
    content: any
    agentData?: any
    sourceMemoryIds?: string[]
  }>

Returns: Page & { blocks: PageBlock[] }
```

---

## 4. Preferences

### `preferences/get`
All user preferences.

```
Params:
  category?: string          — filter: food, travel, accommodation, schedule...

Returns: Preference[]
```

### `preferences/set`
Set or update a preference.

```
Params:
  category: string
  key: string
  value: any
  importance?: must | prefer | nice_to_have    — default: prefer
  negotiable?: boolean                          — default: true

Returns: Preference
Side effects:
  → UPSERT preferences (unique: userId + category + key)
```

---

## 5. Tasks (CRM for the agent)

**The user assigns tasks to their AI. The AI sees them on each connection, executes them, and reports back.**

User-facing UI: a "Your AI's Tasks" page — a list of tasks with statuses.

### `tasks/list`
List of user's tasks for the AI.

```
Params:
  status?: pending | in_progress | done | failed
  projectId?: string         — filter by project (optional)

Returns: Task[]
```

### `tasks/get`
Task details.

```
Params:
  taskId: string

Returns: Task & { logs: TaskLog[] }
```

### `tasks/update`
The AI updates the task status and writes a report.

```
Params:
  taskId: string
  status?: pending | in_progress | done | failed
  result?: any               — execution result (JSON)
  log?: string               — text log ("Found 3 hotels, saved to memory")

Returns: Task
Side effects:
  → INSERT task_logs (if log is provided)
  → Socket.io → TASK_UPDATED (UI updates in realtime)
```

### Tables

```
tasks
├── id              cuid2, PK
├── userId          FK → users.id, CASCADE
├── projectId       FK → projects.id, nullable   — project binding (optional)
├── title           varchar(500), not null
├── prompt          text, not null                — FULL prompt for the AI
├── status          enum: pending | in_progress | done | failed
├── priority        enum: low | normal | high | urgent
├── result          jsonb, nullable               — execution result
├── scheduledAt     timestamp, nullable           — deferred task
├── completedAt     timestamp, nullable
├── createdAt       timestamp
└── updatedAt       timestamp

task_logs
├── id              cuid2, PK
├── taskId          FK → tasks.id, CASCADE
├── message         text, not null                — "Started hotel search", "Saved 3 options"
├── metadata        jsonb, nullable               — additional data
├── createdAt       timestamp
```

### How it works

**User creates a task via UI:**
```
Title: "Find hotels in Barcelona"
Prompt: "Find 5 hotels in Barcelona for March 15-22, 2026.
  Consider my preferences (budget, dietary).
  Check the Health project for restrictions.
  Save the options to the 'Barcelona 2026' project memory.
  Create a comparison page."
Project: Barcelona 2026
Priority: high
```

**AI on connection:**
```
1. tasks/list(status: "pending") → sees the task
2. Reads task.prompt → understands what to do
3. tasks/update(taskId, status: "in_progress", log: "Started search")
4. memory/search("hotel budget") → preferences
5. memory/search("health restrictions") → cross-project
6. ... performs the work ...
7. memory/write(projectId, hotels data)
8. pages/create(projectId, comparison page)
9. tasks/update(taskId, status: "done",
     result: { hotelsFound: 5, pageCreated: "hotels-comparison" },
     log: "Found 5 hotels, created comparison page")
```

**User sees in the UI:**
```
✅ Find hotels in Barcelona            done    2 min ago
   └── Found 5 hotels, created comparison page
       → Open page

⏳ Update my lab results summary       pending
   └── Awaiting execution

🔄 Monitor flight ticket prices        in_progress
   └── Last check: 1 hour ago, price unchanged
```

### Task examples

```
"Check Moscow-Barcelona flight prices for March 15 every day.
 If the price drops below 15,000₽ — save to memory and notify."

"Read my lab results (Health project) and update the page
 with vitamin recommendations."

"Find vegetarian restaurants near Hotel Arts.
 Add them to the itinerary page in the Barcelona project."

"Compare 3 travel insurance options. Consider my medications from the Health project.
 Create a comparison page."
```

---

## 6. Negotiations (group projects)

### `negotiations/list`
Active conflicts in the project.

```
Params:
  projectId: string
  status?: open | resolved | dismissed

Returns: Negotiation[]
```

### `negotiations/propose`
An agent proposes a compromise option.

```
Params:
  negotiationId: string
  title: string
  description: string
  proposedValue: any
  reasoning: string

Returns: NegotiationOption
Side effects:
  → INSERT negotiation_options
  → Socket.io → NEGOTIATION_PROPOSAL
```

---

## Summary

| Group | Tools | Count |
|-------|-------|-------|
| Projects | list, get, create, update | 4 |
| Memory | write, read, search, update, delete | 5 |
| Pages | list, get, create, update | 4 |
| Preferences | get, set | 2 |
| Tasks | list, get, update | 3 |
| Negotiations | list, propose | 2 |
| **Total** | | **20** |

Tasks are created by the user via UI (with a prompt). The AI sees tasks via MCP, executes them, and reports back. The user sees progress in realtime.
