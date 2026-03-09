import { eq, and, desc, gt } from 'drizzle-orm';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  tasks,
  taskLogs,
  activityLog,
  createId,
} from '@loomknot/shared/db';
import { db } from '@/services/db.js';
import { toolResult, toolError, McpToolError } from '@/utils/errors.js';
import { requireProjectMembership } from '@/utils/permissions.js';

export function registerTaskTools(
  server: McpServer,
  userId: string,
  apiKeyId: string,
): void {
  // --- tasks/list ---
  server.tool(
    'tasks/list',
    'List your tasks with optional filters by status and project',
    {
      status: z
        .enum(['pending', 'in_progress', 'done', 'failed'])
        .optional()
        .describe('Filter by task status'),
      projectId: z.string().optional().describe('Filter by project'),
      limit: z.number().int().min(1).max(100).optional().describe('Max items (default 20)'),
      cursor: z.string().optional().describe('Cursor for pagination (task ID)'),
    },
    async ({ status, projectId, limit, cursor }) => {
      try {
        const pageSize = limit ?? 20;

        const conditions = [eq(tasks.userId, userId)];

        if (status) {
          conditions.push(eq(tasks.status, status));
        }
        if (projectId) {
          conditions.push(eq(tasks.projectId, projectId));
        }
        if (cursor) {
          conditions.push(gt(tasks.id, cursor));
        }

        const rows = await db
          .select()
          .from(tasks)
          .where(and(...conditions))
          .orderBy(desc(tasks.createdAt))
          .limit(pageSize + 1);

        const hasMore = rows.length > pageSize;
        const data = hasMore ? rows.slice(0, pageSize) : rows;
        const nextCursor = hasMore ? data[data.length - 1].id : null;

        return toolResult({ tasks: data, nextCursor, hasMore });
      } catch (err) {
        if (err instanceof McpToolError) return toolError(err.code, err.message);
        console.error('tasks/list error:', err);
        return toolError('INTERNAL', 'Failed to list tasks');
      }
    },
  );

  // --- tasks/get ---
  server.tool(
    'tasks/get',
    'Get a task with its logs',
    {
      taskId: z.string().describe('Task ID'),
    },
    async ({ taskId }) => {
      try {
        const taskRows = await db
          .select()
          .from(tasks)
          .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
          .limit(1);

        if (taskRows.length === 0) {
          return toolError('NOT_FOUND', 'Task not found');
        }

        const task = taskRows[0];

        const logs = await db
          .select()
          .from(taskLogs)
          .where(eq(taskLogs.taskId, taskId))
          .orderBy(taskLogs.createdAt);

        return toolResult({ ...task, logs });
      } catch (err) {
        if (err instanceof McpToolError) return toolError(err.code, err.message);
        console.error('tasks/get error:', err);
        return toolError('INTERNAL', 'Failed to get task');
      }
    },
  );

  // --- tasks/create ---
  server.tool(
    'tasks/create',
    'Create a new task for yourself',
    {
      title: z.string().min(1).max(500).describe('Task title'),
      prompt: z.string().min(1).describe('Task prompt/instructions'),
      projectId: z.string().optional().describe('Associate task with a project'),
      priority: z
        .enum(['low', 'normal', 'high', 'urgent'])
        .optional()
        .describe('Task priority (default: normal)'),
      scheduledAt: z.string().optional().describe('ISO date string for scheduled execution'),
    },
    async ({ title, prompt, projectId, priority, scheduledAt }) => {
      try {
        // Verify project membership if projectId is provided
        if (projectId) {
          await requireProjectMembership(userId, projectId);
        }

        const taskId = createId();

        const [task] = await db
          .insert(tasks)
          .values({
            id: taskId,
            userId,
            projectId: projectId ?? null,
            title,
            prompt,
            priority: priority ?? 'normal',
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          })
          .returning();

        // Log activity (fire-and-forget, only if projectId is set)
        if (projectId) {
          db.insert(activityLog)
            .values({
              projectId,
              userId,
              apiKeyId,
              action: 'task.create',
              targetType: 'task',
              targetId: taskId,
              metadata: { title, priority: priority ?? 'normal' },
            })
            .catch(() => {});
        }

        return toolResult(task);
      } catch (err) {
        if (err instanceof McpToolError) return toolError(err.code, err.message);
        console.error('tasks/create error:', err);
        return toolError('INTERNAL', 'Failed to create task');
      }
    },
  );

  // --- tasks/update ---
  server.tool(
    'tasks/update',
    'Update a task status, result, or add a log entry',
    {
      taskId: z.string().describe('Task ID'),
      status: z
        .enum(['pending', 'in_progress', 'done', 'failed'])
        .optional()
        .describe('New task status'),
      result: z.unknown().optional().describe('Task result data (JSON)'),
      log: z.string().optional().describe('Log message to append'),
    },
    async ({ taskId, status, result, log }) => {
      try {
        // Verify ownership
        const existing = await db
          .select()
          .from(tasks)
          .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
          .limit(1);

        if (existing.length === 0) {
          return toolError('NOT_FOUND', 'Task not found');
        }

        const task = existing[0];

        // Update task fields
        const updates: Record<string, unknown> = {};
        if (status !== undefined) {
          updates.status = status;
          if (status === 'done' || status === 'failed') {
            updates.completedAt = new Date();
          }
        }
        if (result !== undefined) updates.result = result;

        if (Object.keys(updates).length > 0) {
          await db
            .update(tasks)
            .set(updates)
            .where(eq(tasks.id, taskId));
        }

        // Add log entry if provided
        if (log) {
          await db.insert(taskLogs).values({
            taskId,
            message: log,
            metadata: status ? { statusChange: status } : null,
          });
        }

        // Fetch updated task
        const [updated] = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, taskId))
          .limit(1);

        // Log activity (fire-and-forget, only if projectId is set)
        if (task.projectId) {
          db.insert(activityLog)
            .values({
              projectId: task.projectId,
              userId,
              apiKeyId,
              action: 'task.update',
              targetType: 'task',
              targetId: taskId,
              metadata: { updated: Object.keys(updates), hasLog: !!log },
            })
            .catch(() => {});
        }

        return toolResult(updated);
      } catch (err) {
        if (err instanceof McpToolError) return toolError(err.code, err.message);
        console.error('tasks/update error:', err);
        return toolError('INTERNAL', 'Failed to update task');
      }
    },
  );
}
