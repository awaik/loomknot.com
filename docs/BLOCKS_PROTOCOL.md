# Block Type Protocol

Typed block catalog for Loomknot page content. Provides clear guidance to AI agents on expected block types and content structure, while remaining lenient — unknown types are accepted with warnings, not rejected.

Inspired by A2UI's philosophy: a declarative catalog of trusted components ensures multi-agent trust boundaries without blocking experimentation.

## Block Type Catalog

| Type | Description | Required Fields |
|------|-------------|-----------------|
| `text` | Rich text paragraph | `text` |
| `heading` | Section heading (h1–h6) | `text` |
| `image` | Single image with optional caption | `url` |
| `map` | Interactive map with markers | `center: {lat, lng}` |
| `list` | Bulleted/ordered list | `items` |
| `itinerary` | Day-by-day travel plan | `items: [{title}]` |
| `place` | Point of interest | `name` |
| `budget` | Cost breakdown | `items: [{category}]` |
| `gallery` | Multiple images | `images: [{url}]` |

## Content Schemas

### `text`

```json
{
  "text": "Barcelona is a vibrant city on the Mediterranean coast."
}
```

### `heading`

```json
{
  "text": "Day 1: Arrival",
  "level": 2
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | yes | Heading text |
| `level` | 1–6 | no | Heading level (default: renderer decides) |

### `image`

```json
{
  "url": "/s3/project-abc/sagrada-familia.jpg",
  "alt": "Sagrada Familia exterior",
  "caption": "Gaudí's masterpiece"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | yes | Image URL |
| `alt` | string | no | Alt text for accessibility |
| `caption` | string | no | Visible caption |

### `map`

```json
{
  "center": { "lat": 41.3874, "lng": 2.1686 },
  "zoom": 13,
  "markers": [
    { "lat": 41.4036, "lng": 2.1744, "label": "Sagrada Familia" },
    { "lat": 41.3916, "lng": 2.1649, "label": "Casa Batlló" }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `center` | `{lat, lng}` | yes | Map center coordinates |
| `zoom` | number | no | Zoom level |
| `markers` | array | no | Map markers with lat, lng, optional label |

### `list`

```json
{
  "items": [
    "Pack sunscreen",
    { "text": "Book airport transfer", "done": true },
    { "text": "Exchange currency" }
  ]
}
```

Items can be plain strings or objects with a `text` field (extra fields like `done` are allowed via passthrough).

### `itinerary`

```json
{
  "date": "2026-03-15",
  "dayNumber": 1,
  "items": [
    { "title": "Arrive at BCN airport", "time": "10:30", "notes": "Terminal 1" },
    { "title": "Check in at hotel", "time": "14:00" },
    { "title": "Walk La Rambla", "time": "16:00", "duration": "2h" }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `items` | array | yes | Itinerary items, each with required `title` |
| `date` | string | no | Date (ISO 8601) |
| `dayNumber` | number | no | Day number in trip |

Each item requires `title`; extra fields (`time`, `duration`, `notes`, `location`) are allowed.

### `place`

```json
{
  "name": "Sagrada Familia",
  "category": "landmark",
  "coordinates": { "lat": 41.4036, "lng": 2.1744 },
  "rating": 4.8,
  "priceLevel": "$$"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Place name |
| `category` | string | no | Category (restaurant, hotel, landmark, etc.) |
| `coordinates` | `{lat, lng}` | no | Location coordinates |

Extra fields (`rating`, `priceLevel`, `address`, `url`, `phone`) are allowed.

### `budget`

```json
{
  "currency": "EUR",
  "items": [
    { "category": "flights", "amount": 180, "per": "person" },
    { "category": "hotel", "amount": 120, "per": "night", "nights": 7 },
    { "category": "food", "amount": 50, "per": "day" }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `items` | array | yes | Budget items, each with required `category` |
| `currency` | string | no | ISO currency code |

Each item requires `category`; extra fields (`amount`, `per`, `nights`, `notes`) are allowed.

### `gallery`

```json
{
  "images": [
    { "url": "/s3/project-abc/beach.jpg", "caption": "Barceloneta Beach" },
    { "url": "/s3/project-abc/park-guell.jpg", "alt": "Park Güell mosaic" }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `images` | array | yes | Image objects, each with required `url` |

Each image requires `url`; extra fields (`alt`, `caption`, `width`, `height`) are allowed.

## `agentData` Guidelines

The `agentData` field on each block is free-form and not validated. Conventions:

- Use it for agent-specific metadata (confidence scores, source URLs, generation context)
- Prefix keys with agent name to avoid collisions: `{ "claude": { "confidence": 0.9 } }`
- Keep it small — large payloads should go into memory, not `agentData`

## Validation Behavior

Validation is **lenient** — warnings, not errors:

| Scenario | Result | Warning |
|----------|--------|---------|
| Known type, valid content | Accepted | None |
| Known type, missing required field | Accepted | "Block type 'place' at 'name': Required" |
| Known type, extra fields | Accepted | None (passthrough) |
| Unknown type | Accepted | Lists known types, notes it may not render |

Validation runs in the MCP server on `pages_create` and `pages_update`. Warnings are returned in the `_warnings` array of the tool response. The API does not validate block content for MVP.

## For AI Agents

Quick MCP reference for creating page blocks:

```
Tool: pages_create
  blocks: [
    { type: "heading", content: { text: "Barcelona Trip", level: 1 } },
    { type: "text", content: { text: "A 7-day adventure..." } },
    { type: "map", content: { center: { lat: 41.39, lng: 2.17 }, markers: [...] } },
    { type: "itinerary", content: { dayNumber: 1, items: [{ title: "Arrive" }] } }
  ]
```

Check `_warnings` in the response to catch content issues early.

## Extension Guide

To add a new block type:

1. Add type to `BLOCK_TYPES` in `packages/shared/src/constants/index.ts`
2. Create content schema in `packages/shared/src/blocks/index.ts`
3. Register schema in `BLOCK_CONTENT_SCHEMAS` map
4. Add frontend renderer in `apps/web/src/components/blocks/`
5. Update this document

## Security Model

In a multi-agent environment, the block catalog provides a trust boundary:

- **Known types** render with dedicated UI components (safe, tested)
- **Unknown types** fall back to JSON display (visible but not executable)
- **Content validation** catches malformed data before it reaches the frontend
- **`agentData`** is never rendered to end users — agent-only metadata
- Warnings give agents immediate feedback without blocking their workflow
