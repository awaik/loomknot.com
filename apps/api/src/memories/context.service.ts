import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, eq, isNull } from 'drizzle-orm';
import { memories, projects, type DrizzleDB } from '@loomknot/shared/db';
import { DATABASE_TOKEN } from '../database/database.provider';

@Injectable()
export class ContextService {
  private readonly logger = new Logger(ContextService.name);

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async regenerate(projectId: string): Promise<void> {
    const rows = await this.db
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
      await this.db
        .update(projects)
        .set({ context: null, summary: null })
        .where(eq(projects.id, projectId));

      this.eventEmitter.emit('project.updated', {
        projectId,
        project: { id: projectId, context: null, summary: null },
      });
      return;
    }

    // Group by category
    const grouped = new Map<string, typeof rows>();
    for (const row of rows) {
      const arr = grouped.get(row.category) ?? [];
      arr.push(row);
      grouped.set(row.category, arr);
    }

    // Build markdown context
    const sections: string[] = [];
    const categorySummaries: string[] = [];

    for (const [category, items] of grouped) {
      const lines: string[] = [`## ${category}`];
      for (const item of items) {
        const display = item.summary ?? this.formatValue(item.value);
        lines.push(`- **${item.key}**: ${display}`);
      }
      sections.push(lines.join('\n'));
      categorySummaries.push(`${category} (${items.length})`);
    }

    const context = `# Project Context\n\n${sections.join('\n\n')}`;
    const summary = `${rows.length} memories across ${grouped.size} categories: ${categorySummaries.join(', ')}`;

    await this.db
      .update(projects)
      .set({ context, summary })
      .where(eq(projects.id, projectId));

    this.logger.debug(
      `Regenerated context for project ${projectId}: ${rows.length} memories, ${grouped.size} categories`,
    );

    this.eventEmitter.emit('project.updated', {
      projectId,
      project: { id: projectId, context, summary },
    });
  }

  private formatValue(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return '';
    return JSON.stringify(value);
  }
}
