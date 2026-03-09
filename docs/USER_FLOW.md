# Loomknot — User Flow & Data Architecture (Simplified)

## Core Concept

**Project = folder with AI memory.** Like CLAUDE.md for programmers, but for regular people.

Each project has:
- **context.md** — auto-generated full context (what AI reads before answering)
- **summary** — one paragraph describing the project (used for routing)
- **memories** — facts, decisions, preferences (everything the AI should remember)
- **pages** — beautiful visual output (itineraries, comparisons, maps)
- **tasks** — CRM for AI (what to do, progress, results)

No global user settings. No preferences outside projects. Everything lives inside a project.

---

## 1. How a User Interacts

### 1.1 Creating a Project

User creates a project via UI or asks AI:

```
User in chat: "I want to track my health"

AI: Created project "Health". What should I remember?

User: "I take Omega-3 and Vitamin D daily. Allergic to penicillin."

AI: Saved to project "Health":
  - Supplements: Omega-3, Vitamin D (daily)
  - Allergy: penicillin
```

Result in DB:
```
projects:  { title: "Health", summary: "", context: "" }
memories:  { category: "supplements", key: "daily", value: {items: ["Omega-3", "Vitamin D"]} }
memories:  { category: "allergies", key: "penicillin", value: {type: "medication", severity: "strict"} }
```

After each change, `context.md` and `summary` are regenerated (async):
```
summary:  "Health tracking: supplements (Omega-3, Vitamin D), allergies (penicillin)."
context:  "# Health\n\n## Supplements\n- Omega-3 (daily)\n- Vitamin D (daily)\n\n## Allergies\n- Penicillin (strict, medication)\n"
```

### 1.2 Routing — How AI Finds the Right Project

User has up to 100 projects. Each has a short `summary` (one paragraph).

**Option A — AI selects automatically:**

```
User: "What painkiller should I take?"

System (behind the scenes):
  1. Collect all project summaries (up to 100 paragraphs)
  2. Send to LLM: "Which projects are relevant to this question?"
     - "Health tracking: supplements (Omega-3, Vitamin D), allergies (penicillin)" ← match
     - "Barcelona trip March 2026: flights, hotels, itinerary" ← no
     - "Home renovation: kitchen, bathroom, contractor quotes" ← no
  3. LLM returns: top match = "Health" (confidence: high)

AI: "Looking in your Health project..."
  → loads context.md
  → loads relevant memories
  → answers: "Given your penicillin allergy, avoid Aspirin if cross-reactive.
     Ibuprofen (Nurofen) or Paracetamol are safe options."
```

**Option B — User specifies directly:**

```
User: "Health project — add that I started taking magnesium"
  → direct match by title, no routing needed
  → memory/write
```

**Option C — Ambiguous, ask user:**

```
User: "Find a good restaurant"

System routes → top matches:
  1. "Barcelona trip" (has food-related memories)
  2. "Moscow favorites" (restaurant list)
  3. "Diet plan" (food restrictions)

AI: "I found a few relevant projects:
  1. Barcelona trip
  2. Moscow favorites
  3. Diet plan
  Which one should I work in? Or should I create a new project?"

User: "Barcelona"
  → proceed in Barcelona project
```

### 1.3 Chat Within a Project

Once a project is selected, AI has full context:

```
[Project: Barcelona 2026]

context.md loaded:
  # Barcelona 2026
  ## Trip details
  - Dates: March 15-22, 2026
  - Travelers: 2 (me + wife)
  ## Accommodation
  - Prefer: quiet area, walking distance to center
  - Budget: up to 150€/night
  ## Food
  - Vegetarian (strict)
  - No cilantro
  ## Decided
  - Hotel Arts (180€/night, beach, booked)

User: "Find where to have dinner on the first evening"

AI (knows from context: vegetarian, no cilantro, staying at Hotel Arts):
  "Near Hotel Arts, here are 3 vegetarian-friendly restaurants:
   1. Flax & Kale (10 min walk) — plant-based, no cilantro dishes available
   2. Teresa Carles (20 min, Gothic Quarter) — classic vegetarian
   3. Green Spot (15 min) — Asian-vegetarian fusion
   Should I add them to the itinerary?"

User: "Add Flax & Kale for day 1 dinner"

AI:
  → memory/write: { category: "restaurants", key: "flax_and_kale", value: {...} }
  → pages/update: adds restaurant to day 1 itinerary block
  → context.md regenerated with new info
```

### 1.4 "Remember This"

```
User: "I bought Nurofen 400mg, remember that"

AI:
  → Routes to "Health" project
  → memory/write: { category: "medications", key: "nurofen", value: {name: "Nurofen", dose: "400mg", type: "painkiller"} }
  → context.md updated:
      ## Medications
      - Nurofen 400mg (painkiller)
      ## Supplements
      - Omega-3, Vitamin D (daily)

AI: "Saved to Health project. Now I know you have Nurofen if you need a painkiller."
```

---

## 2. Pages — Beautiful Output

Pages are the visual result of AI's work. A page consists of blocks.

### 2.1 Block Types

| Type | What it renders | Example |
|------|----------------|---------|
| `text` | Rich text (markdown) | Trip intro, restaurant review |
| `map` | Interactive map with markers | Hotels, restaurants, route |
| `itinerary` | Day-by-day timeline | Day 1: arrival → Gothic Quarter → dinner |
| `place` | Place card (photo, rating, price) | Hotel Arts: 5★, 180€, beachfront |
| `budget` | Cost breakdown table | Accommodation 1260€ + Food 420€ = 1680€ |
| `gallery` | Photo grid | Trip inspiration photos |

### 2.2 How a Page is Created

```
User: "Make a page with our Barcelona itinerary"

AI:
  1. Reads project context.md (dates, hotel, preferences)
  2. Reads relevant memories (restaurants, activities decided)
  3. Creates page with blocks:

  pages/create:
    title: "Barcelona March 2026"
    blocks:
      - type: "text", content: { markdown: "# Barcelona for Two\nMarch 15-22..." }
      - type: "map", content: { center: {lat, lng}, markers: [...hotels, restaurants] }
      - type: "itinerary", content: { date: "2026-03-15", items: [...] }
      - type: "itinerary", content: { date: "2026-03-16", items: [...] }
      - type: "budget", content: { items: [...], totalPerPerson: 840 }
      - type: "place", content: { name: "Hotel Arts", rating: 4.6, ... }

  4. Each block stores sourceMemoryIds — links to memories it was built from
```

### 2.3 Updating a Single Block

AI can update one block without touching the rest:

```
User: "Replace the day 2 lunch restaurant"

AI:
  → finds the itinerary block for day 2
  → updates only that block's content
  → pages/update(pageId, blocks: [{ id: blockId, content: newContent }])
  → page re-renders, only the changed block updates
```

### 2.4 Stale Detection

If a memory changes after a block was built from it:
```
memory "hotel_choice" updated (changed from Hotel Arts to W Hotel)
  → block with sourceMemoryIds containing "hotel_choice" is marked stale
  → UI shows: "This block may be outdated. Regenerate?"
  → AI or user triggers regeneration
```

---

## 3. Tasks — CRM for AI

Users assign work to their AI. The AI picks up tasks, executes them, reports back.

### 3.1 User Creates a Task (via UI)

```
┌─────────────────────────────────────────────┐
│  New Task                                    │
│                                              │
│  Title: Find hotels in Barcelona             │
│                                              │
│  Prompt:                                     │
│  Find 5 hotels in Barcelona for March 15-22. │
│  Consider my preferences from this project.  │
│  Budget up to 150€/night, quiet area.        │
│  Save options to project memory.             │
│  Create a comparison page.                   │
│                                              │
│  Project: Barcelona 2026                     │
│  Priority: ● High                            │
│                                              │
│  [Create Task]                               │
└─────────────────────────────────────────────┘
```

### 3.2 AI Executes the Task

```
AI connects via MCP:

1. tasks/list(status: "pending") → sees "Find hotels in Barcelona"
2. tasks/update(status: "in_progress", log: "Starting hotel search")
3. Reads project context.md → knows budget, dates, preferences
4. Searches for hotels (external APIs or AI knowledge)
5. memory/write × 5 (saves each hotel option)
6. pages/create (comparison page with place blocks)
7. tasks/update(status: "done",
     result: { hotelsFound: 5, pageCreated: "hotel-comparison" },
     log: "Found 5 hotels within budget. Created comparison page.")
```

### 3.3 User Sees Progress (realtime via Socket.io)

```
┌─────────────────────────────────────────────┐
│  Your AI's Tasks                             │
│                                              │
│  ✅ Find hotels in Barcelona        2m ago   │
│     Found 5 hotels. Created comparison page. │
│     → Open page                              │
│                                              │
│  🔄 Monitor flight prices          running   │
│     Last check: 1h ago, price unchanged.     │
│     Current best: 14,500₽ (Aeroflot)        │
│                                              │
│  ⏳ Update vitamin recommendations  pending   │
│     Waiting for AI to pick up                │
└─────────────────────────────────────────────┘
```

---

## 4. Group Projects & Negotiations

### 4.1 Inviting Members

```
User (Masha): Creates "Barcelona 2026" → invites Petya by email
Petya: Accepts invite → becomes a project member (role: editor)
Petya: Connects his own AI agent (his own API key)
```

### 4.2 Memory Levels in Group Projects

| Level | Who sees | Example |
|-------|----------|---------|
| **private** | Only the author + their agent | "My budget is actually 200€ but I said 150€" |
| **project** | All project members + their agents | "We chose Hotel Arts" |
| **public** | Anyone with the link | Final itinerary page data |

### 4.3 Preference Conflicts → Negotiation

```
Masha's memories: { category: "budget", key: "per_night", value: 100 }
Petya's memories: { category: "budget", key: "per_night", value: 250 }

System detects conflict:
  → INSERT negotiations (title: "Nightly budget", conflictData: {100 vs 250})
  → LLM generates 3 compromise options:
      Option A: 150€/night (mid-range, wider selection)
      Option B: 120€/night (closer to Masha, use savings for activities)
      Option C: 180€/night (closer to Petya, beach area)

Both members vote:
  Masha: Option B ✓
  Petya: Option C ✓
  → No consensus, second round or discussion

  Petya changes to Option A ✓
  → Resolved: 150€/night
  → INSERT memories (level: project, key: "budget_decision", value: 150)
  → context.md updated for all members
```

---

## 5. context.md — The Brain of Each Project

Auto-generated after every memory change. This is what AI reads before answering.

### 5.1 Example: Health Project

```markdown
# Health

## Medications
- Nurofen 400mg (painkiller, as needed)

## Supplements
- Omega-3 (daily)
- Vitamin D (daily)
- Magnesium (daily, started March 2026)

## Allergies
- Penicillin (strict, medication allergy)

## Lab Results
- Last blood test: January 2026
- Vitamin D: low (reason for supplement)
- Iron: normal range

## Notes
- Prefers natural remedies when possible
```

### 5.2 Example: Barcelona 2026 Project

```markdown
# Barcelona 2026

## Trip Details
- Dates: March 15-22, 2026 (7 nights)
- Travelers: 2 (Masha + Petya)
- Trip style: walking, cultural, food-focused

## Budget
- Accommodation: 150€/night (negotiated, was 100 vs 250)
- Food: ~60€/day per person
- Total estimate: ~2,000€ per person

## Accommodation
- Hotel Arts (booked)
  - 180€/night, beachfront, 5★
  - Breakfast included

## Food Preferences
- Masha: vegetarian (strict), no cilantro
- Petya: no restrictions, prefers local cuisine

## Decided
- Day 1 dinner: Flax & Kale (vegetarian, near hotel)
- Gothic Quarter walking tour: Day 2 morning

## Open Questions
- Airport transfer: taxi or Aerobus?
- Day trip to Montserrat: yes or no?
```

### 5.3 How context.md is Generated

```
Trigger: any memory write/update/delete in the project

1. Load all project memories (project-level + user's private if solo project)
2. Group by category
3. Send to LLM: "Generate a concise project context document from these memories.
   Format as markdown. Include all facts, decisions, and open questions.
   Keep it under 2000 words."
4. Save result to projects.context
5. Also generate a 1-paragraph summary → projects.summary
```

### 5.4 summary (for Routing)

One paragraph, used to match user messages to projects:

```
"Health tracking project. Medications: Nurofen 400mg. Daily supplements:
Omega-3, Vitamin D, Magnesium. Allergy to penicillin. Last lab results
January 2026."
```

```
"Barcelona trip March 15-22, 2026 for two people (Masha + Petya).
Hotel Arts booked. Budget 150€/night. Masha is vegetarian. Cultural
and food-focused trip. Some restaurants and activities decided."
```

---

## 6. Routing Pipeline

For up to 100 projects, no vector search needed. Simple LLM call.

```
User message: "What painkiller is safe for me?"
        │
        ▼
┌──────────────────────────────┐
│  Collect all project         │
│  summaries (up to 100)       │
│  ~100 paragraphs ≈ 5-10K    │
│  tokens                      │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  LLM call:                   │
│  "Given this user message    │
│   and these project          │
│   summaries, return top 1-5  │
│   relevant projects with     │
│   confidence scores."        │
│                              │
│  → [{id: "health", score:    │
│      0.95, reason: "has      │
│      medication data"}]      │
└──────────┬───────────────────┘
           │
     ┌─────┴──────┐
     │             │
  score > 0.8   score < 0.8
     │             │
     ▼             ▼
  Auto-select   Ask user:
  "Health"      "Which project?"
     │             │
     ▼             ▼
┌──────────────────────────────┐
│  Load project context.md     │
│  + relevant memories         │
│  → Answer with full context  │
└──────────────────────────────┘
```

**Cost estimate:** 100 summaries × ~50 words = ~5,000 tokens input. Fast, cheap, no infrastructure needed.

---

## 7. Data Model (Simplified)

### Tables

```
IDENTITY
  users               — id, email, name, avatar
  sessions            — refresh tokens
  api_keys            — MCP access (one key = all user's projects)

PROJECTS
  projects            — id, slug, title, description, vertical,
                        context, summary,            ← NEW
                        ownerId, isPublic, settings
  project_members     — userId, projectId, role
  invites             — email, token, role, status

CONTENT
  pages               — id, projectId, slug, title, status, sortOrder
  page_blocks         — id, pageId, type, content (JSONB), agentData (JSONB),
                        sourceMemoryIds, sortOrder

MEMORY
  memories            — id, projectId, userId, level (private/project/public),
                        category, key, value (JSONB), summary,
                        source (user/agent/negotiation/system)
                        ← NO embedding, NO confidence, NO expiresAt

TASKS
  tasks               — id, userId, projectId, title, prompt, status, priority,
                        result, scheduledAt, completedAt
  task_logs           — id, taskId, message, metadata

NEGOTIATION
  negotiations        — id, projectId, title, category, status, conflictData
  negotiation_options — id, negotiationId, title, proposedValue, reasoning
  negotiation_votes   — id, optionId, userId, vote, comment

AUDIT
  activity_log        — id, projectId, userId, apiKeyId, action,
                        targetType, targetId, metadata
```

### Removed from Original Design

| Removed | Reason |
|---------|--------|
| `preferences` table | Everything is memories inside projects |
| `embedding` field in memories | Routing via LLM + summaries, not pgvector |
| pgvector extension | Not needed for up to 100 projects |
| `confidence` field in memories | Overengineering for MVP |
| `expiresAt` field in memories | Can add later if needed |
| Global user data | No data outside projects |

### Added

| Added | Where | Purpose |
|-------|-------|---------|
| `context` | projects table | Full AI context (auto-generated markdown) |
| `summary` | projects table | One paragraph for routing |

---

## 8. MCP Tools (Simplified)

20 tools → 16 tools (removed preferences/get and preferences/set, simplified).

| Group | Tools | Count |
|-------|-------|-------|
| Projects | list, get, create, update | 4 |
| Memory | write, read, search, update, delete | 5 |
| Pages | list, get, create, update | 4 |
| Tasks | list, get, update | 3 |
| **Total** | | **16** |

`memory/search` — no longer uses pgvector. Searches by category/key within a project or uses LLM to find relevant memories across projects (same routing pipeline).

Negotiations are triggered automatically by the system when conflicting memories are detected in group projects — no direct MCP tool for agents.

---

## 9. User Scenarios

### Scenario A: Personal Health Tracking

```
1. User: "Create a health project"
   → projects/create("Health")

2. User: "I take Omega-3 and Vitamin D daily, allergic to penicillin"
   → memory/write × 2 (supplements, allergy)
   → context.md generated
   → summary: "Health: Omega-3, Vitamin D, penicillin allergy"

3. [A week later]
   User: "What painkiller should I take for a headache?"
   → Routing: matches "Health" project (summary mentions medications/allergy)
   → Loads context.md → sees penicillin allergy
   → Answers: "Nurofen or Paracetamol are safe for you"

4. User: "I bought Nurofen 400mg, remember that"
   → memory/write (medications, nurofen)
   → context.md updated
```

### Scenario B: Trip Planning (Solo)

```
1. User: "I'm going to Milan, help me plan"
   → projects/create("Milan 2026")

2. User: "I like quiet neighborhoods but close to center. Budget 120€/night."
   → memory/write × 2

3. User: "Find me a hotel"
   → AI reads context.md → knows budget + preferences
   → Suggests hotels
   → User picks one → memory/write

4. User: "Make a page with the itinerary"
   → pages/create with itinerary + map + hotel + budget blocks

5. User: "Share this with my mom"
   → projects/update(isPublic: true)
   → Public URL: loomknot.com/p/milan-2026
```

### Scenario C: Group Trip with Negotiation

```
1. Masha: Creates "Barcelona 2026", invites Petya
2. Both write their preferences as memories:
   - Masha: budget 100€, vegetarian, museums
   - Petya: budget 250€, nightlife, beaches
3. System detects conflicts → creates negotiations
4. Both vote on compromise options
5. Resolved decisions → project memories
6. AI creates pages using resolved preferences
7. Published: loomknot.com/p/barcelona-2026
```

### Scenario D: Cross-Project Context

```
User: "Plan a trip considering my health"

Routing:
  → "Health" project: has medication/allergy data
  → "Milan 2026" project: the active trip

AI:
  → Loads Health context.md (penicillin allergy, supplements)
  → Loads Milan context.md (dates, budget, preferences)
  → Plans trip considering health constraints
  → Writes results to Milan project
```

### Scenario E: Task Execution

```
1. User creates task in UI:
   "Monitor Milan-Moscow flights for March 10.
    If price drops below 15,000₽, save and notify me."

2. AI picks up task via MCP:
   → tasks/update(status: "in_progress")
   → Checks prices periodically
   → tasks/update(log: "Current price: 18,000₽, watching...")

3. Price drops:
   → memory/write(category: "flights", value: {price: 14,200, airline: "..."})
   → tasks/update(status: "done", result: {price: 14200})
   → User gets notification in UI
```
