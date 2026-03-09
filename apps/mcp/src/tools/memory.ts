import { eq, and, or, isNull, desc, ilike, inArray, gt, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  memories,
  projectMembers,
  activityLog,
  createId,
} from '@loomknot/shared/db';
import { db } from '@/services/db.js';
import { toolResult, toolError, McpToolError } from '@/utils/errors.js';
import { requireProjectMembership, requirePermission } from '@/utils/permissions.js';
import { regenerateContext } from '@/services/context-generator.js';

export function registerMemoryTools(
  server: McpServer,
  userId: string,
  apiKeyId: string,
): void {
  // --- memory/write ---
  server.tool(
    'memory_write',
    'Loomknot: save a memory entry to a project (preferences, decisions, constraints). Upserts by category + key. Levels: private (only you), project (all members), public (shareable via link).',
    {
      projectId: z.string().describe('Project ID'),
      category: z.string().min(1).max(100).describe('Memory category (e.g. "preferences", "decisions", "constraints")'),
      key: z.string().min(1).max(255).describe('Memory key within the category'),
      value: z.unknown().describe('Memory value (any JSON-serializable data)'),
      summary: z.string().max(1000).optional().describe('Human-readable summary of this memory'),
      level: z
        .enum(['private', 'project', 'public'])
        .optional()
        .describe('Memory visibility level (default: project)'),
    },
    async ({ projectId, category, key, value, summary, level }) => {
      try {
        await requirePermission(userId, projectId, 'canEditMemory');

        const memoryLevel = level ?? 'project';

        // UPSERT: use the unique index (projectId, userId, category, key)
        const result = await db
          .insert(memories)
          .values({
            id: createId(),
            projectId,
            userId,
            level: memoryLevel,
            category,
            key,
            value,
            summary: summary ?? null,
            source: 'agent',
            apiKeyId,
          })
          .onConflictDoUpdate({
            target: [memories.projectId, memories.userId, memories.category, memories.key],
            set: {
              value,
              summary: summary ?? null,
              level: memoryLevel,
              source: 'agent',
              apiKeyId,
              deletedAt: null, // un-soft-delete if previously deleted
            },
          })
          .returning();

        const memory = result[0];

        // Log activity (fire-and-forget)
        db.insert(activityLog)
          .values({
            projectId,
            userId,
            apiKeyId,
            action: 'memory.create',
            targetType: 'memory',
            targetId: memory.id,
            metadata: { category, key, level: memoryLevel },
          })
          .catch(() => {});

        // Regenerate context if project-level memory (fire-and-forget)
        if (memoryLevel === 'project') {
          regenerateContext(projectId).catch(() => {});
        }

        return toolResult(memory);
      } catch (err) {
        if (err instanceof McpToolError) return toolError(err.code, err.message);
        console.error('memory_write error:', err);
        return toolError('INTERNAL', 'Failed to write memory');
      }
    },
  );

  // --- memory/bulk-write ---
  server.tool(
    'memory_bulk-write',
    'Loomknot: save multiple memory entries at once (max 50). All items must belong to the same project.',
    {
      projectId: z.string().describe('Project ID'),
      items: z
        .array(
          z.object({
            category: z.string().min(1).max(100),
            key: z.string().min(1).max(255),
            value: z.unknown(),
            summary: z.string().max(1000).optional(),
            level: z.enum(['private', 'project', 'public']).optional(),
          }),
        )
        .min(1)
        .max(50)
        .describe('Array of memory items to write (max 50)'),
    },
    async ({ projectId, items }) => {
      try {
        await requirePermission(userId, projectId, 'canEditMemory');

        const results = await db.transaction(async (tx) => {
          const inserted: typeof memories.$inferSelect[] = [];
          for (const item of items) {
            const memoryLevel = item.level ?? 'project';

            const result = await tx
              .insert(memories)
              .values({
                id: createId(),
                projectId,
                userId,
                level: memoryLevel,
                category: item.category,
                key: item.key,
                value: item.value,
                summary: item.summary ?? null,
                source: 'agent',
                apiKeyId,
              })
              .onConflictDoUpdate({
                target: [memories.projectId, memories.userId, memories.category, memories.key],
                set: {
                  value: item.value,
                  summary: item.summary ?? null,
                  level: memoryLevel,
                  source: 'agent',
                  apiKeyId,
                  deletedAt: null,
                },
              })
              .returning();

            inserted.push(result[0]);
          }
          return inserted;
        });

        // Single context regeneration after all writes
        const hasProjectLevel = items.some((item) => (item.level ?? 'project') === 'project');
        if (hasProjectLevel) {
          regenerateContext(projectId).catch(() => {});
        }

        // Log activity (fire-and-forget)
        for (const memory of results) {
          db.insert(activityLog)
            .values({
              projectId,
              userId,
              apiKeyId,
              action: 'memory.create',
              targetType: 'memory',
              targetId: memory.id,
              metadata: { category: memory.category, key: memory.key },
            })
            .catch(() => {});
        }

        return toolResult({ written: results.length, memories: results });
      } catch (err) {
        if (err instanceof McpToolError) return toolError(err.code, err.message);
        console.error('memory_bulk-write error:', err);
        return toolError('INTERNAL', 'Failed to bulk-write memories');
      }
    },
  );

  // --- memory/read ---
  server.tool(
    'memory_read',
    'Loomknot: read memories from a project with filtering by category and level. Supports cursor pagination. Private memories are only visible to their owner.',
    {
      projectId: z.string().describe('Project ID'),
      category: z.string().optional().describe('Filter by category'),
      level: z.enum(['private', 'project', 'public']).optional().describe('Filter by memory level'),
      limit: z.number().int().min(1).max(100).optional().describe('Max items to return (default 20)'),
      cursor: z.string().optional().describe('Cursor for pagination (memory ID)'),
    },
    async ({ projectId, category, level, limit, cursor }) => {
      try {
        await requireProjectMembership(userId, projectId);

        const pageSize = limit ?? 20;

        // Build conditions
        const conditions = [
          eq(memories.projectId, projectId),
          isNull(memories.deletedAt),
        ];

        if (category) {
          conditions.push(eq(memories.category, category));
        }

        if (level) {
          conditions.push(eq(memories.level, level));
          // If filtering by private, only show own memories
          if (level === 'private') {
            conditions.push(eq(memories.userId, userId));
          }
        } else {
          // Without level filter: show project+public memories, plus own private
          conditions.push(
            or(
              eq(memories.level, 'project'),
              eq(memories.level, 'public'),
              and(eq(memories.level, 'private'), eq(memories.userId, userId)),
            )!,
          );
        }

        if (cursor) {
          conditions.push(gt(memories.id, cursor));
        }

        const rows = await db
          .select()
          .from(memories)
          .where(and(...conditions))
          .orderBy(memories.id)
          .limit(pageSize + 1);

        const hasMore = rows.length > pageSize;
        const data = hasMore ? rows.slice(0, pageSize) : rows;
        const nextCursor = hasMore ? data[data.length - 1].id : null;

        return toolResult({
          memories: data,
          nextCursor,
          hasMore,
        });
      } catch (err) {
        if (err instanceof McpToolError) return toolError(err.code, err.message);
        console.error('memory_read error:', err);
        return toolError('INTERNAL', 'Failed to read memories');
      }
    },
  );

  // --- memory/search ---
  server.tool(
    'memory_search',
    'Loomknot: search memories by text across key, summary, and category. Can search across all your projects or a specific one.',
    {
      query: z.string().min(1).max(500).describe('Search query text'),
      projectId: z.string().optional().describe('Limit search to a specific project'),
      category: z.string().optional().describe('Limit search to a category'),
      limit: z.number().int().min(1).max(50).optional().describe('Max results (default 20)'),
    },
    async ({ query, projectId, category, limit }) => {
      try {
        const pageSize = limit ?? 20;
        const pattern = `%${query}%`;

        const conditions = [
          isNull(memories.deletedAt),
          or(
            ilike(memories.key, pattern),
            ilike(memories.summary, pattern),
            ilike(memories.category, pattern),
          )!,
        ];

        if (projectId) {
          await requireProjectMembership(userId, projectId);
          conditions.push(eq(memories.projectId, projectId));
        } else {
          // Search across all user's projects
          const memberProjects = await db
            .select({ projectId: projectMembers.projectId })
            .from(projectMembers)
            .where(eq(projectMembers.userId, userId));

          if (memberProjects.length === 0) {
            return toolResult({ memories: [], total: 0 });
          }

          conditions.push(
            inArray(
              memories.projectId,
              memberProjects.map((m) => m.projectId),
            ),
          );
        }

        if (category) {
          conditions.push(eq(memories.category, category));
        }

        // Access control: only show own private memories
        conditions.push(
          or(
            eq(memories.level, 'project'),
            eq(memories.level, 'public'),
            and(eq(memories.level, 'private'), eq(memories.userId, userId)),
          )!,
        );

        const rows = await db
          .select()
          .from(memories)
          .where(and(...conditions))
          .orderBy(desc(memories.updatedAt))
          .limit(pageSize);

        return toolResult({ memories: rows, total: rows.length });
      } catch (err) {
        if (err instanceof McpToolError) return toolError(err.code, err.message);
        console.error('memory_search error:', err);
        return toolError('INTERNAL', 'Failed to search memories');
      }
    },
  );

  // --- memory/update ---
  server.tool(
    'memory_update',
    'Loomknot: update an existing memory entry (value, summary, or visibility level). You must own the memory.',
    {
      memoryId: z.string().describe('Memory ID to update'),
      value: z.unknown().optional().describe('New value'),
      summary: z.string().max(1000).optional().describe('New summary'),
      level: z.enum(['private', 'project', 'public']).optional().describe('New visibility level'),
    },
    async ({ memoryId, value, summary, level }) => {
      try {
        // Verify ownership and project membership
        const existing = await db
          .select()
          .from(memories)
          .where(and(eq(memories.id, memoryId), isNull(memories.deletedAt)))
          .limit(1);

        if (existing.length === 0) {
          return toolError('NOT_FOUND', 'Memory not found');
        }

        const memory = existing[0];
        if (memory.userId !== userId) {
          return toolError('FORBIDDEN', 'You can only update your own memories');
        }

        await requireProjectMembership(userId, memory.projectId);

        const updates: Record<string, unknown> = {};
        if (value !== undefined) updates.value = value;
        if (summary !== undefined) updates.summary = summary;
        if (level !== undefined) updates.level = level;

        if (Object.keys(updates).length === 0) {
          return toolError('VALIDATION', 'No fields to update');
        }

        const updated = await db
          .update(memories)
          .set(updates)
          .where(eq(memories.id, memoryId))
          .returning();

        // Log activity (fire-and-forget)
        db.insert(activityLog)
          .values({
            projectId: memory.projectId,
            userId,
            apiKeyId,
            action: 'memory.update',
            targetType: 'memory',
            targetId: memoryId,
            metadata: { updated: Object.keys(updates) },
          })
          .catch(() => {});

        // Regenerate context if project-level
        const finalLevel = level ?? memory.level;
        if (finalLevel === 'project' || memory.level === 'project') {
          regenerateContext(memory.projectId).catch(() => {});
        }

        return toolResult(updated[0]);
      } catch (err) {
        if (err instanceof McpToolError) return toolError(err.code, err.message);
        console.error('memory_update error:', err);
        return toolError('INTERNAL', 'Failed to update memory');
      }
    },
  );

  // --- memory/delete ---
  server.tool(
    'memory_delete',
    'Loomknot: delete a memory entry. You must own the memory.',
    {
      memoryId: z.string().describe('Memory ID to delete'),
    },
    async ({ memoryId }) => {
      try {
        // Verify ownership and project membership
        const existing = await db
          .select()
          .from(memories)
          .where(and(eq(memories.id, memoryId), isNull(memories.deletedAt)))
          .limit(1);

        if (existing.length === 0) {
          return toolError('NOT_FOUND', 'Memory not found');
        }

        const memory = existing[0];
        if (memory.userId !== userId) {
          return toolError('FORBIDDEN', 'You can only delete your own memories');
        }

        await requireProjectMembership(userId, memory.projectId);

        await db
          .update(memories)
          .set({ deletedAt: new Date() })
          .where(eq(memories.id, memoryId));

        // Log activity (fire-and-forget)
        db.insert(activityLog)
          .values({
            projectId: memory.projectId,
            userId,
            apiKeyId,
            action: 'memory.delete',
            targetType: 'memory',
            targetId: memoryId,
            metadata: { category: memory.category, key: memory.key },
          })
          .catch(() => {});

        // Regenerate context if project-level
        if (memory.level === 'project') {
          regenerateContext(memory.projectId).catch(() => {});
        }

        return toolResult({ deleted: true, memoryId });
      } catch (err) {
        if (err instanceof McpToolError) return toolError(err.code, err.message);
        console.error('memory_delete error:', err);
        return toolError('INTERNAL', 'Failed to delete memory');
      }
    },
  );
}
