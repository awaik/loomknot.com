import { eq, and, inArray } from 'drizzle-orm';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  users,
  projects,
  projectMembers,
  tasks,
} from '@loomknot/shared/db';
import { db } from '@/services/db.js';
import { toolResult, toolError, classifyError } from '@/utils/errors.js';

export function registerBootstrapTools(
  server: McpServer,
  userId: string,
  _apiKeyId: string,
): void {
  server.tool(
    'lk_bootstrap',
    'Loomknot: start a session. Returns your user info, all collaborative projects (trips, events, plans) with summaries, and pending tasks. Always call this first when connecting to Loomknot.',
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

        // Get all user's projects (lightweight — no correlated subqueries)
        const userProjects = await db
          .select({
            projectId: projectMembers.projectId,
            role: projectMembers.role,
            title: projects.title,
            slug: projects.slug,
            vertical: projects.vertical,
            isPublic: projects.isPublic,
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
            vertical: p.vertical,
            isPublic: p.isPublic,
            role: p.role,
          })),
          pendingTasks,
        });
      } catch (err) {
        return classifyError(err, 'lk_bootstrap');
      }
    },
  );
}
