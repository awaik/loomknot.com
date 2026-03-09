import { eq, and, isNull } from 'drizzle-orm';
import { memories, projects } from '@loomknot/shared/db';
import { db } from './db.js';

interface MemoryRow {
  category: string;
  key: string;
  value: unknown;
  summary: string | null;
}

/**
 * Regenerate the project context and summary from all project-level memories.
 *
 * Loads all non-deleted, project-level memories, groups them by category,
 * and builds a markdown context document + a short summary string.
 * Updates `projects.context` and `projects.summary`.
 */
export async function regenerateContext(projectId: string): Promise<void> {
  // Load all project-level, non-deleted memories
  const rows = await db
    .select({
      category: memories.category,
      key: memories.key,
      value: memories.value,
      summary: memories.summary,
    })
    .from(memories)
    .where(
      and(
        eq(memories.projectId, projectId),
        eq(memories.level, 'project'),
        isNull(memories.deletedAt),
      ),
    );

  if (rows.length === 0) {
    await db
      .update(projects)
      .set({ context: null, summary: null })
      .where(eq(projects.id, projectId));
    return;
  }

  // Group by category
  const grouped = new Map<string, MemoryRow[]>();
  for (const row of rows) {
    const list = grouped.get(row.category) ?? [];
    list.push(row);
    grouped.set(row.category, list);
  }

  // Build markdown context
  const sections: string[] = [];
  const categorySummaries: string[] = [];

  for (const [category, items] of grouped) {
    const lines: string[] = [`## ${category}`];
    for (const item of items) {
      const display = item.summary ?? formatValue(item.value);
      lines.push(`- **${item.key}**: ${display}`);
    }
    sections.push(lines.join('\n'));
    categorySummaries.push(`${category} (${items.length})`);
  }

  const context = `# Project Context\n\n${sections.join('\n\n')}`;
  const summary = `${rows.length} memories across ${grouped.size} categories: ${categorySummaries.join(', ')}`;

  await db
    .update(projects)
    .set({ context, summary })
    .where(eq(projects.id, projectId));
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return JSON.stringify(value);
}
