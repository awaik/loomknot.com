# Loomknot — Data Structure and Application Logic

## 1. Entity Map

```
┌─────────────────────────────────────────────────────────────────┐
│                          IDENTITY                                │
│                                                                  │
│  User ──1:M──> Session (refresh tokens)                          │
│    │                                                             │
│    ├──1:M──> ApiKey (key = access to all user's projects)        │
│    └──M:M──> Project (through ProjectMember)                     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                          PROJECT                                 │
│                                                                  │
│  Project ──1:M──> ProjectMember (member roles)                   │
│    │                                                             │
│    ├──1:M──> Page (project pages)                                │
│    ├──1:M──> Memory (memories/data)                              │
│    ├──1:M──> Negotiation (conflict resolution)                   │
│    └──1:M──> Invite (invitations)                                │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                          CONTENT                                 │
│                                                                  │
│  Page ──1:M──> PageBlock (content blocks)                        │
│    └── renderMode: human | agent                                 │
│                                                                  │
│  Memory ──> embedding (pgvector for semantic search)             │
│    └── level: private | project | public                         │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                          NEGOTIATION                             │
│                                                                  │
│  Negotiation ──1:M──> NegotiationOption (compromise options)     │
│    └──> NegotiationVote (member votes)                           │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                          AUDIT                                   │
│                                                                  │
│  ActivityLog (who, what, when — user or agent)                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Tables — Detailed Design

### 2.1 users

```
users
├── id              cuid2, PK
├── email           varchar(255), unique, not null
├── name            varchar(255)
├── avatarUrl       text
├── tokenVersion    integer, default 0        — JWT invalidation (++ on logout)
├── onboardingDone  boolean, default false
├── createdAt       timestamp, default now()
└── updatedAt       timestamp, default now(), onUpdate
```

**Question:** Do we need `locale` / `timezone` for users? Or should it be a preference?

---

### 2.2 projects

```
projects
├── id              cuid2, PK
├── slug            varchar(100), unique, not null    — URL: /p/{slug}
├── title           varchar(255), not null
├── description     text
├── vertical        varchar(50), default 'general'    — travel, wedding, renovation...
├── ownerId         FK → users.id
├── isPublic        boolean, default false             — public page
├── settings        jsonb, default {}                  — flexible project settings
├── createdAt       timestamp
└── updatedAt       timestamp
```

**`settings` JSONB — examples:**
```json
{
  "defaultCurrency": "EUR",
  "dateRange": { "from": "2026-03-15", "to": "2026-03-22" },
  "coverImageUrl": "...",
  "enableNegotiation": true,
  "allowPublicAgentAccess": false
}
```

**Question:** `settings` as JSONB — flexible, but no DB-level validation. Fine for MVP?

---

### 2.3 project_members

```
project_members
├── id              cuid2, PK
├── projectId       FK → projects.id, CASCADE
├── userId          FK → users.id, CASCADE
├── role            enum: owner | admin | editor | member | viewer
├── joinedAt        timestamp, default now()
└── UNIQUE(projectId, userId)
```

---

### 2.4 invites

```
invites
├── id              cuid2, PK
├── projectId       FK → projects.id, CASCADE
├── invitedBy       FK → users.id
├── email           varchar(255)                  — who was invited
├── role            enum: editor | member | viewer   — role upon joining
├── token           varchar(64), unique           — one-time token
├── status          enum: pending | accepted | expired
├── expiresAt       timestamp
├── createdAt       timestamp
└── acceptedAt      timestamp, nullable
```

---

### 2.5 pages

```
pages
├── id              cuid2, PK
├── projectId       FK → projects.id, CASCADE
├── slug            varchar(200), not null
├── title           varchar(500), not null
├── description     text
├── status          enum: draft | published | archived
├── sortOrder       integer, default 0
├── createdBy       FK → users.id
├── createdAt       timestamp
├── updatedAt       timestamp
└── UNIQUE(projectId, slug)
```

Each project has one system page with slug `index`. It is created together
with the project, uses a reserved sort order before child pages, cannot be
deleted, and serves as the project main page. Agent-created detail pages are
child pages; after creating or materially updating one, the agent updates
`index` with the current summary and links.

**Question: where does the page content live?**

**Option A — Blocks in a separate `page_blocks` table:**
```
page_blocks
├── id              cuid2, PK
├── pageId          FK → pages.id, CASCADE
├── type            varchar(50)          — text, map, itinerary, gallery, place, budget...
├── content         jsonb, not null      — block data (depends on type)
├── agentData       jsonb                — structured data for the agent
├── sourceMemoryIds text[]               — which memories were used for generation
├── sortOrder       integer
├── createdAt       timestamp
└── updatedAt       timestamp
```

Pros: granular updates, blocks can be reordered, each block can reference source memories.

**Option B — Content as a JSONB array in `pages.content`:**
```
pages.content = jsonb  — array of blocks [{type, content, agentData, sourceMemoryIds}]
```

Pros: simpler, single query, no JOINs. Cons: updating one block overwrites the entire array.

**Recommendation:** Option A (separate table) — pages will be frequently updated block by block (an agent suggests replacing a single restaurant, not the entire page).

---

### 2.6 memories

**This is the core table of the project. Memory is the core primitive.**

```
memories
├── id              cuid2, PK
├── projectId       FK → projects.id, CASCADE
├── userId          FK → users.id, nullable       — null for system/agent memories
├── level           enum: private | project | public
│
│   ── Content ──
├── category        varchar(100)                  — accommodation, food, transport, activity...
├── key             varchar(255)                  — budget_per_night, food_restriction, hotel_choice...
├── value           jsonb, not null               — value (any type)
├── summary         text                          — human-readable description
│
│   ── Metadata ──
├── source          enum: user | agent | negotiation | system
├── apiKeyId        FK → api_keys.id, nullable    — which key was used to write (if agent)
├── confidence      real, default 1.0             — 0.0–1.0, for inferred data
├── expiresAt       timestamp, nullable           — TTL for temporary decisions
│
│   ── Vector ──
├── embedding       vector(1536), nullable        — pgvector for semantic search
│
├── createdAt       timestamp
└── updatedAt       timestamp

INDEXES:
  - (projectId, level)
  - (projectId, userId, level)
  - (projectId, category)
  - (userId, level)                — cross-project search for private memories
  - embedding — HNSW index for cross-project vector search
```

**Example records:**

```json
// Private memory (visible only to Masha and her agent)
{
  "level": "private",
  "userId": "masha_id",
  "category": "food",
  "key": "dietary_restriction",
  "value": { "type": "vegetarian", "severity": "strict" },
  "summary": "Strict vegetarian",
  "source": "user",
  "confidence": 1.0
}

// Project memory (visible to all members)
{
  "level": "project",
  "userId": null,
  "category": "accommodation",
  "key": "hotel_decision",
  "value": { "name": "Hotel Arts", "pricePerNight": 180, "stars": 5, "bookingUrl": "..." },
  "summary": "Chose Hotel Arts, 180€/night",
  "source": "negotiation",
  "confidence": 1.0
}

// Public memory (visible on the public page)
{
  "level": "public",
  "userId": null,
  "category": "itinerary",
  "key": "day_1",
  "value": { "date": "2026-03-15", "items": [...] },
  "summary": "Day 1: arrival, Gothic Quarter, dinner at Cervecería Catalana",
  "source": "agent"
}
```

**Questions for discussion:**

1. **Memory versioning?** Do we need change history? Options:
   - No — overwrite value. Simple, but history is lost
   - Soft versions — `previousValue` JSONB field
   - Separate `memory_versions` table — full audit
   - **Recommendation:** For MVP — no. Audit via `activity_log`. Versioning — later

2. **Limits:** 500 private / 2000 project — sufficient? Or should we count differently?

3. **TTL:** `expiresAt` — for temporary decisions ("consider this hotel until Friday"). Cron job cleans expired records. Needed?

---

---

### 2.8 api_keys

**One key = one user = access to all their projects.**

The user creates a key once, connects it to their AI — and that's it. The AI gets access to a personal data store: can read any user project, create new projects, write pages, search across all projects via memory.

```
api_keys
├── id              cuid2, PK
├── userId          FK → users.id, CASCADE
├── keyHash         varchar(255), not null        — bcrypt hash
├── keyPrefix       varchar(8), not null          — "lk_a3f..." for UI display
├── label           varchar(255)                  — "My Claude", "Work key"
├── status          enum: active | revoked
├── lastUsedAt      timestamp, nullable
├── createdAt       timestamp
└── updatedAt       timestamp

UNIQUE(keyHash)
```

**Authentication flow:**
```
AI → request to MCP (Authorization: Bearer lk_a3fK9x...)
  → MCP server: finds api_key → knows userId
  → userId → access to all user's projects
  → For each operation, check role in the specific project
```

**Connection — one-time setup:**
```
Account settings → "Create API key" → lk_a3fK9x...
  → Paste into Claude Desktop / ChatGPT / any MCP client
  → Done. AI sees all projects, can create new ones.
```

### MCP — User's Personal Data Store

The MCP server is not a "gateway to a single project", but a **personal data layer**. Through a single key, the AI gets full access to the user's data.

**MCP Tools:**

```
── Projects ──
lk_projects_list           — list all user's projects
lk_projects_get            — data for a specific project
lk_projects_create         — create a new project

── Memory (always with projectId) ──
lk_memory_read             — read project memory
lk_memory_write            — write to project memory
lk_memory_search           — semantic search ACROSS ALL user's projects
lk_memory_delete           — delete a record

── Pages ──
lk_pages_list              — list project pages
lk_pages_get               — get a page
lk_pages_create            — create a child page in the project
lk_pages_update            — update a page; sync `index` after child-page changes

```

**Key feature — cross-project search:**
```
User: "Where should I go given my health conditions?"

AI calls lk_memory_search(query: "health contraindications medications")
  → Searches ACROSS ALL user's projects
  → Finds in the "Health" project: test results, medications, restrictions
  → Combines with private memories from other projects (budget, interests)
  → Responds with full context taken into account
```

**Usage examples:**

```
1. "Write up a long read about my test results"
   → AI: lk_projects_create("Health")
   → AI: lk_memory_write(projectId, test results as structured data)
   → AI: lk_pages_create(projectId, long read with visualizations)

2. "What headache pill can I take given my current medications?"
   → AI: lk_memory_search("medications I'm taking")
   → Finds in the "Health" project → list of current medications
   → Responds considering contraindications (WITHOUT writing to MCP)

3. "Where should I go on vacation?"
   → AI: lk_memory_search("health restrictions climate")
   → Finds: "no hot climates" (from "Health" project)
   → AI: lk_memory_search("budget interests travel preferences")
   → Finds private memories across projects
   → Suggests destinations considering ALL context

4. "Plan a trip to Barcelona"
   → AI: lk_projects_create("Barcelona 2026")
   → AI: lk_memory_search("dietary food restrictions")
   → Finds: "vegetarian" + "nut allergy" (from "Health" project)
   → Generates an itinerary considering both restrictions
```

---

### 2.9 tasks (CRM for the agent)

**The user creates tasks for their AI via the UI. The AI sees them through MCP, executes them, and reports back. The user sees progress on the "Your AI's Tasks" page.**

```
tasks
├── id              cuid2, PK
├── userId          FK → users.id, CASCADE
├── projectId       FK → projects.id, nullable   — linked to project (optional)
├── title           varchar(500), not null
├── prompt          text, not null                — full prompt for the AI
├── status          enum: pending | in_progress | done | failed
├── priority        enum: low | normal | high | urgent
├── result          jsonb, nullable               — execution result
├── scheduledAt     timestamp, nullable           — deferred task
├── completedAt     timestamp, nullable
├── createdAt       timestamp
└── updatedAt       timestamp
```

### 2.10 task_logs

```
task_logs
├── id              cuid2, PK
├── taskId          FK → tasks.id, CASCADE
├── message         text, not null                — "Started searching hotels", "Saved 3 options"
├── metadata        jsonb, nullable
├── createdAt       timestamp
```

---

### 2.11 negotiations

```
negotiations
├── id              cuid2, PK
├── projectId       FK → projects.id, CASCADE
├── title           varchar(500)
├── description     text
├── category        varchar(100)                  — accommodation, budget, schedule, activity
├── status          enum: open | resolved | dismissed
├── conflictData    jsonb                         — what conflicts (preferences A vs B)
├── resolvedMemoryId FK → memories.id, nullable   — result → record in project memory
├── createdBy       FK → users.id, nullable       — null if system-detected
├── resolvedAt      timestamp, nullable
├── createdAt       timestamp
└── updatedAt       timestamp
```

### 2.12 negotiation_options

```
negotiation_options
├── id              cuid2, PK
├── negotiationId   FK → negotiations.id, CASCADE
├── title           varchar(500)
├── description     text
├── proposedValue   jsonb                         — concrete proposal
├── reasoning       text                          — why this option is good
├── source          enum: agent | user             — who proposed it
├── apiKeyId        FK → api_keys.id, nullable    — which key was used (if agent)
├── sortOrder       integer
├── createdAt       timestamp
└── updatedAt       timestamp
```

### 2.13 negotiation_votes

```
negotiation_votes
├── id              cuid2, PK
├── optionId        FK → negotiation_options.id, CASCADE
├── userId          FK → users.id, CASCADE
├── vote            enum: approve | reject | neutral
├── comment         text, nullable
├── createdAt       timestamp
└── UNIQUE(optionId, userId)
```

**Question: voting model.**
- **Simple:** Everyone votes approve/reject. Majority wins.
- **Weighted:** Vote weight depends on role (owner > member) or on preference.importance
- **Consensus:** Everyone must approve, otherwise a new round of proposals
- **Recommendation:** For MVP — simple majority. Can be made more complex later.

---

### 2.14 activity_log

```
activity_log
├── id              cuid2, PK
├── projectId       FK → projects.id, CASCADE
├── userId          FK → users.id, nullable
├── apiKeyId        FK → api_keys.id, nullable    — if action was performed by an agent
├── action          varchar(50)       — memory.create, memory.update, page.suggest, negotiation.vote...
├── targetType      varchar(50)       — memory, page, preference, negotiation
├── targetId        cuid2
├── metadata        jsonb             — details (old/new value, agentName from User-Agent, etc.)
├── createdAt       timestamp

INDEX: (projectId, createdAt DESC)
```

---

### 2.13 sessions (refresh tokens)

```
sessions
├── id              cuid2, PK
├── userId          FK → users.id, CASCADE
├── tokenHash       varchar(255), not null
├── userAgent       text
├── ipAddress       varchar(45)
├── expiresAt       timestamp, not null
├── createdAt       timestamp
```

---

## 3. Key Questions for Discussion

### Q1: How do permanent user traits work without a separate preferences table?

All user data lives in `memories` inside projects. Permanent traits ("vegetarian", "nut allergy") are stored as private memories in relevant projects (e.g., "Health"). Cross-project search (`lk_memory_search`) lets agents find these traits from any project context.

This avoids duplication between a global preferences table and project memories. The agent reads private memories + project memories for the full picture.

---

### Q2: How does an agent see others' private memories for negotiation?

**Problem:** Private memories are private by definition. But negotiation requires comparing different people's members' preferences.

**Solution:** The agent does NOT see others' private memories. The negotiation engine works server-side:

```
1. Server collects all members' project-level memories (NOT private memories)
2. Server detects conflict (Masha: budget 80€, Petya: budget 200€)
3. Server calls LLM to generate compromises
4. LLM sees only categories + values, NOT user names (anonymization)
5. Options are published in negotiation → everyone votes
```

Private memories with sensitive data (medical restrictions) act as must-constraints for the owner's agent but are never exposed to other members or the negotiation engine.

---

### Q3: Page generation — where does the content come from?

**Generation flow:**

```
Page request (human mode)
  │
  ├── 1. Load page + page_blocks from DB
  │
  ├── 2. For each block with sourceMemoryIds:
  │      └── fetch current memories
  │
  ├── 3. If block is stale (memory updated after the block):
  │      └── mark for regeneration
  │
  └── 4. Render: React components by block.type
         ├── type=map      → MapBlock (Leaflet/Mapbox)
         ├── type=itinerary → ItineraryBlock (timeline)
         ├── type=place     → PlaceCard (photo + info)
         └── type=text      → RichText
```

**Who creates blocks?**
- **Agent:** via MCP tool `page_suggest` → creates block draft
- **User:** manually adds blocks (drag & drop editor)
- **System:** auto-generation when creating a project (template blocks)

---

### Q4: How is `page_blocks.content` structured for different types?

```json
// type: "text"
{ "markdown": "# Welcome to Barcelona\nThe best time..." }

// type: "map"
{
  "center": { "lat": 41.3851, "lng": 2.1734 },
  "zoom": 13,
  "markers": [
    { "lat": 41.3818, "lng": 2.1685, "label": "Gothic Quarter", "icon": "walking" },
    { "lat": 41.3925, "lng": 2.1640, "label": "Hotel Arts", "icon": "hotel" }
  ]
}

// type: "itinerary"
{
  "date": "2026-03-15",
  "dayNumber": 1,
  "items": [
    { "time": "09:00", "title": "Arrival", "type": "transport", "notes": "T2, luggage to hotel" },
    { "time": "11:00", "title": "Gothic Quarter", "type": "activity", "duration": "3h" },
    { "time": "14:00", "title": "Cervecería Catalana", "type": "restaurant", "priceRange": "€€" }
  ]
}

// type: "place"
{
  "name": "Hotel Arts Barcelona",
  "category": "accommodation",
  "address": "Carrer de la Marina, 19-21",
  "coordinates": { "lat": 41.3886, "lng": 2.1978 },
  "rating": 4.6,
  "pricePerNight": 180,
  "currency": "EUR",
  "imageUrl": "...",
  "tags": ["beachfront", "5-star", "pool"],
  "bookingUrl": "..."
}

// type: "budget"
{
  "items": [
    { "category": "Accommodation", "perNight": 180, "nights": 7, "total": 1260 },
    { "category": "Food", "perDay": 60, "days": 7, "total": 420 },
    { "category": "Activities", "total": 300 }
  ],
  "totalPerPerson": 660,
  "totalGroup": 1980,
  "currency": "EUR"
}

// type: "gallery"
{
  "images": [
    { "url": "...", "caption": "Sagrada Familia", "credit": "unsplash" }
  ]
}
```

**`agentData`** — the same block, but in machine-readable format:
```json
// type: "place" → agentData
{
  "schema": "Place",
  "coordinates": [2.1978, 41.3886],
  "constraints": {
    "priceRange": [150, 200],
    "mustHave": ["wifi", "breakfast"],
    "dietary": ["vegetarian_options"]
  },
  "alternativeIds": ["memory_id_1", "memory_id_2"]
}
```

---

### Q5: Do we need tables for travel-specific entities?

**Option A — Everything in JSONB (memories + page_blocks):**
- Hotels, restaurants, activities — just memories with different categories
- No separate `hotels`, `restaurants` tables
- Pros: flexible, domain-agnostic, fast to add verticals
- Cons: no FKs, no DB-level type safety

**Option B — Separate tables:**
- `places` (universal — hotels, restaurants, attractions)
- `itinerary_items`
- Pros: FKs, indexes, type safety
- Cons: adding a "wedding" vertical requires new tables

**Recommendation:** Option A for MVP. All domain logic lives in JSONB (memories + page_blocks). Zod schemas validate the structure at the application level. If any entity becomes a hot path — extract it into a separate table.

---

### Q6: How does "one URL — different content for different users" work?

**Scenario:** Masha and Petya open `loomknot.com/p/barcelona-2026`. Masha sees vegetarian restaurants first, Petya sees bars.

**Implementation:**

```
GET /p/{slug}
  │
  ├── Authenticated?
  │     ├── Yes → load private memories in this project
  │     │         → render with personalization (sorting, filtering, highlights)
  │     │
  │     └── No → show public version (project memories + public memories)
  │
  └── For an agent? (Accept: application/mcp+json)
        └── Return structured agentData
```

**Personalization at the block level:**
- "Restaurants" block sorted by dietary match
- "Budget" block shows "your share" vs "total"
- "Itinerary" block highlights "suits you" / "compromise"

**These are NOT different pages.** It's one page + one set of blocks + client-side personalization based on private memories.

---

### Q7: Table creation order (migrations)

```
Batch 1 (Core):
  users → sessions

Batch 2 (Projects):
  projects → project_members → invites

Batch 3 (Content):
  pages → page_blocks

Batch 4 (Memory):
  memories

Batch 5 (API Keys):
  api_keys

Batch 6 (Negotiation):
  negotiations → negotiation_options → negotiation_votes

Batch 7 (Audit):
  activity_log
```

---

## 4. User Scenarios → Data Operations

### Scenario A: "Masha runs a personal Health project"

```
1. Masha registers → creates API key → connects it to Claude
   → INSERT users
   → INSERT api_keys (userId: masha)

2. Masha in Claude: "Write up a long read about my test results" (attaches PDF)
   → Claude via MCP: lk_projects_create("Health", vertical: "health")
   → INSERT projects (ownerId: masha)
   → INSERT project_members (role: owner)
   → Claude: lk_memory_write × N (test results as structured data)
   → INSERT memories (level: private, category: "blood_test", ...)
   → Claude: lk_pages_create("Tests 2026", blocks with visualizations)
   → INSERT pages + INSERT page_blocks

3. A week later, Masha in Claude: "What headache pill can I take?"
   → Claude: lk_memory_search("medications I'm taking contraindications")
   → SELECT memories WHERE userId = masha, embedding <=> query_vector
   → Finds in "Health" project: current medications
   → Claude responds considering contraindications (WITHOUT writing to MCP)

4. Masha: "Note that I started taking Omega-3"
   → Claude: lk_memory_write(projectId: health, category: "supplements",
       key: "omega3", value: {name: "Omega-3", since: "2026-03-08"})
   → INSERT memories
```

### Scenario B: "Masha plans a trip with friends"

```
1. Masha (already has API key) in Claude: "Plan a trip to Barcelona"
   → Claude: lk_projects_create("Barcelona 2026", vertical: "travel")
   → Claude: lk_memory_search("health restrictions climate")
     → Finds in "Health" project: no climate restrictions ✓
   → Claude: lk_memory_search("dietary budget travel style")
     → Finds across projects: vegetarian, budget: 100€, walking
   → Claude: lk_pages_create(itinerary considering all found context)

2. Masha invites Petya on the site
   → INSERT invites (email: petya@..., role: editor)
   → Petya accepts → INSERT project_members

3. Petya connects HIS OWN Claude (his own api_key) → also sees the project
   → Petya's Claude: lk_projects_list → sees "Barcelona 2026"
   → Petya's Claude: lk_memory_read(projectId) → sees project memories
   → Petya's Claude: lk_memory_search("budget preferences") → budget: 200€, nightlife

4. System detects a memory conflict
   → INSERT negotiations (budget: 100€ vs 200€)
   → LLM → INSERT negotiation_options ×3
   → Masha and Petya vote → resolved
   → INSERT memories (level: project, key: budget_decision, value: 150€)

5. Either agent updates the page
   → Claude (Masha's or Petya's): lk_pages_update → new blocks considering the decision
   → INSERT activity_log (apiKeyId → we know whose agent wrote it)

6. Masha shares
   → UPDATE projects (isPublic: true)
```

### Scenario C: "Cross-project context"

```
Masha: "Where should I go on vacation considering my health and budget?"

→ Claude: lk_memory_search("health restrictions")
   → "Health" project: no high altitude, taking antihistamines
→ Claude: lk_memory_search("budget finances")
   → "Finances" project (if exists): 2000€ set aside for vacation
→ Claude: lk_memory_search("food travel style budget")
   → Finds across projects: vegetarian, walking, budget 100€/night

→ Claude combines everything → suggests: Croatia, coast, no mountains
→ Masha: "Great, create a project"
→ Claude: lk_projects_create("Croatia 2026") → populates from context
```

---

## 5. Open Questions — Decision Needed

| # | Question | Options | Impact |
|---|----------|---------|--------|
| 1 | Page blocks: separate table or JSONB? | Table (recommended) / JSONB | Content architecture |
| 2 | ~~Preferences~~ | ~~Decided: all data lives in memories inside projects, cross-project search~~ | ~~Decided~~ |
| 3 | ~~API key~~ | ~~Decided: per-user, one key = all projects~~ | ~~Decided~~ |
| 4 | Do we need memory versioning? | No for MVP (recommended) / Yes | Complexity |
| 5 | Travel entities: JSONB or separate tables? | JSONB (recommended) / Tables | Flexibility vs type safety |
| 6 | Negotiation: majority vote or consensus? | Majority (recommended) / Consensus | Negotiation UX |
| 7 | Memory TTL (expiresAt): needed? | Yes — useful for "consider until..." | Cron job |
| 8 | locale/timezone: in users or memories? | Private memory (recommended) | users schema |
| 9 | Activity log: all actions or only important ones? | All mutations (recommended) | DB volume |
| 10 | sessions: in DB or Redis? | Redis (recommended) / DB | Performance |
