# Loomknot — CRM for AI Agents

A platform where people and their AI agents collaboratively manage projects through shared memory.

## What It Does

**Loomknot** is a persistent memory layer between humans and AI. Each project is a structured knowledge base that any MCP-compatible agent (Claude, ChatGPT, Gemini) can connect to, read, and write.

### Three Use Cases

**1. Group Projects (travel, events, planning)**
Four friends plan a trip. Each connects their own AI agent. Agents see shared project memory, know their owner's private preferences, and help negotiate compromises. One agent creates a task "search for flights under €200" — finds options, writes results to project memory, and notifies the group.

**2. Personal Projects (health, finances, learning)**
One person, one project "My Health". The agent remembers everything: test results, medications, symptoms, goals. It creates a task "remind to refill prescription in 2 weeks". Switch from ChatGPT to Claude — memory stays on the platform. The new agent connects, sees all tasks and history, and picks up where the last one left off.

**3. CRM for Agents**
Each project is a "card" with full history. API keys, tasks, activity logs, structured memory by categories. The agent doesn't just chat — it works with data through 24 MCP tools: searching for hotels, comparing options, tracking deadlines, and following up on pending decisions.

## Why It Matters

Today every AI agent has **amnesia** — context is lost between sessions. Everyone tries to solve this at the single-agent level (memory in ChatGPT, Projects in Claude).

Loomknot solves this **at the platform level**:

- **Memory outlives the agent** — switch AI providers, your data stays
- **Multiple agents can work with one memory** — each user brings their own
- **Memory is structured** (categories, keys, levels) — not just a chat log
- **Agents act, not just answer** — they create tasks, track deadlines, search for options, and follow up
- **Built-in conflict resolution** — when agents disagree, they negotiate

## Core Concepts

### Memory — Always Inside a Project

There is no global user memory. Every memory entry belongs to a project. Cross-project search lets agents find relevant data across all user's projects.

### Three Privacy Levels

| Level | Example (Health project) | Who sees it |
|-------|------------------------|-------------|
| **Private** | "taking antidepressants" | Only you and your agent |
| **Project** | "doctor appointment March 15" | All project members |
| **Public** | "nutrition recommendations" | Anyone via link |

Privacy is enforced at the SQL query level — an agent physically cannot read another user's private memory.

### Bring Your Own Agent

No lock-in to a specific AI. Any agent supporting MCP (Model Context Protocol) connects via API key and gets access to 24 tools: read/write memory, create pages, manage tasks, propose compromises.

### Tasks — Agents That Act, Not Just Answer

Agents don't just respond to questions — they **create tasks, track progress, and follow up**.

Your agent can:
- Create a task "find flights to Barcelona under €200" with priority `high`
- Schedule a reminder for next week: "check visa requirements"
- Update task status and log results as it works
- Break complex goals into subtasks across the project

Each task has a full audit trail: logs, status transitions, results stored as structured JSON. The agent reports back what it found, what it did, and what's left.

This turns AI from a "chat window" into an **autonomous assistant** that works on your project over days and weeks — not just within a single conversation.

### Pages = Two Interfaces

Each page exists simultaneously as:
- **Human mode** — beautiful UI with maps, photos, timelines
- **Agent mode** — structured JSON data via MCP

### AiTML — Our Open Block Specification

Loomknot's content blocks follow **AiTML** (AI-first Text Markup Language) — an open specification we develop and maintain for structured content designed for AI agent workflows.

- **Document** = ordered flat array of typed JSON blocks (not a tree)
- **Dual representation**: `data` (structured, for rendering) + `text` (human-readable, for LLM context)
- **14 standard block types**: text, heading, image, gallery, map, timeline, place, booking, weather, budget, checklist, embed, divider, callout
- **Schema-less with conventions**: agents can extend freely; the spec defines recommended structures
- **Transport-agnostic**: blocks travel over MCP, REST, WebSocket, or files

Loomknot is the reference implementation. The spec is published separately and designed for adoption by other platforms.

## Architecture

Turborepo monorepo with three apps:

| Service | Stack | Purpose |
|---------|-------|---------|
| **web** | Next.js 15, React 19, TanStack Query, Tailwind CSS 4 | Frontend |
| **api** | NestJS 11, Fastify, Drizzle ORM, Socket.io | REST API, WebSocket, auth |
| **mcp** | @modelcontextprotocol/sdk, SSE transport | Agent gateway (24 tools) |

Infrastructure: PostgreSQL 16 + pgvector, Redis 7, MinIO, Traefik v3, Docker Swarm.

See [CLAUDE.md](./CLAUDE.md) for full architecture details, server commands, and development instructions.

## Getting Started

```bash
pnpm install

# Start infrastructure + backend
./start-backend.sh

# Start frontend (separate terminal)
./start-frontend.sh

# Start MCP server (separate terminal)
./start-mcp.sh
```

Local app: http://localhost:8026

## Documentation

- [CLAUDE.md](./CLAUDE.md) — architecture, infrastructure, deploy, critical rules
- [docs/DATA_MODEL.md](./docs/DATA_MODEL.md) — database schema and data model
- [docs/LAUNCH_PLAN.md](./docs/LAUNCH_PLAN.md) — launch plan
- [docs/MCP_TOOLS.md](./docs/MCP_TOOLS.md) — MCP tools reference
- [docs/BLOCKS_PROTOCOL.md](./docs/BLOCKS_PROTOCOL.md) — block type catalog and content schemas (AiTML implementation)
