import { eq, and, inArray, sql } from 'drizzle-orm';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  users,
  projects,
  projectMembers,
  memories,
  tasks,
} from '@loomknot/shared/db';
import { db } from '@/services/db.js';
import { toolResult, toolError, McpToolError } from '@/utils/errors.js';

export function registerBootstrapTools(
  server: McpServer,
  userId: string,
  _apiKeyId: string,
): void {
  server.tool(
    'bootstrap',
    'Get user info, all projects with summaries, and pending tasks. Call this first when starting a session.',
    {},
    async () => {
      try {
        // Get user info
        const userRows = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (userRows.length === 0) {
          return toolError('NOT_FOUND', 'User not found');
        }

        const user = userRows[0];

        // Get all user's projects with member count and memory count
        const userProjects = await db
          .select({
            projectId: projectMembers.projectId,
            role: projectMembers.role,
            title: projects.title,
            slug: projects.slug,
            description: projects.description,
            vertical: projects.vertical,
            summary: projects.summary,
            isPublic: projects.isPublic,
            memberCount: sql<number>`(
              SELECT count(*)::int FROM project_members
              WHERE project_id = ${projects.id}
            )`,
            memoryCount: sql<number>`(
              SELECT count(*)::int FROM memories
              WHERE project_id = ${projects.id} AND deleted_at IS NULL
            )`,
          })
          .from(projectMembers)
          .innerJoin(projects, eq(projects.id, projectMembers.projectId))
          .where(eq(projectMembers.userId, userId));

        // Get pending tasks
        const pendingTasks = await db
          .select({
            id: tasks.id,
            title: tasks.title,
            status: tasks.status,
            priority: tasks.priority,
            projectId: tasks.projectId,
            scheduledAt: tasks.scheduledAt,
            createdAt: tasks.createdAt,
          })
          .from(tasks)
          .where(
            and(
              eq(tasks.userId, userId),
              inArray(tasks.status, ['pending', 'in_progress']),
            ),
          );

        return toolResult({
          user,
          projects: userProjects.map((p) => ({
            projectId: p.projectId,
            title: p.title,
            slug: p.slug,
            description: p.description,
            vertical: p.vertical,
            summary: p.summary,
            isPublic: p.isPublic,
            role: p.role,
            memberCount: p.memberCount,
            memoryCount: p.memoryCount,
          })),
          pendingTasks,
        });
      } catch (err) {
        if (err instanceof McpToolError) return toolError(err.code, err.message);
        console.error('bootstrap error:', err);
        return toolError('INTERNAL', 'Failed to load bootstrap data');
      }
    },
  );
}
