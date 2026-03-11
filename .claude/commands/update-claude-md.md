Update CLAUDE.md based on changes made in the current conversation.

## Algorithm

### 1. Analyze changes in the conversation
- Which files were created/modified/deleted
- Which new features or modules were added
- Which data schemas changed (DB, types, interfaces)
- Which API endpoints were added/changed
- Which dependencies were added
- Were any block types added/changed (AiTML sync needed?)

### 2. Read the current CLAUDE.md
- Identify the structure and documentation style
- Find sections affected by the changes
- Note what may be outdated

### 3. Update corresponding sections
- **Project structure** — new files/directories
- **Architecture/schemas** — new entities, fields, relations
- **API/endpoints** — new routes, parameters
- **Configuration** — new env variables
- **Commands** — new scripts, CLI commands
- **Code examples** — if APIs changed
- **AiTML spec sync** — if block types or page_blocks schema changed

### 4. Check for outdated content
- Remove mentions of deleted files/functions
- Fix outdated examples
- Update enums/statuses if new values were added

### 5. Update version and date
- Bump the version number at the bottom of CLAUDE.md
- Update the "Last updated" date

## Documentation format

When adding a new feature:
```
### Feature Name

Brief description.

**Flow:** (ASCII diagram if complex logic)

**Key files:**
| File | Role |
|------|------|
| path/to/file.ts | Description |

**Examples:** (if API involved)
```

## Principles

- Preserve existing documentation style
- Do not duplicate information
- Document "why", not just "what"
- Keep code examples minimal and up-to-date
- All documentation in English (CLAUDE.md critical rule #1)
