import { eq, and, desc, gt } from 'drizzle-orm';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { activityLog } from '@loomknot/shared/db';
import { db } from '@/services/db.js';
import { toolResult, classifyError } from '@/utils/errors.js';
import { requireProjectMembership } from '@/utils/permissions.js';

export function registerActivityTools(
  server: McpServer,
  userId: string,
  _apiKeyId: string,
): void {
  // --- activity/recent ---
  server.tool(
    'activity_recent',
    'Loomknot: get recent activity log for a project — who did what and when.',
    {
      projectId: z.string().describe('Project ID'),
      since: z.string().optional().describe('ISO date string — only return activity after this time'),
      limit: z.number().int().min(1).max(100).optional().describe('Max items (default 20)'),
    },
    async ({ projectId, since, limit }) => {
      try {
        await requireProjectMembership(userId, projectId);

        const pageSize = limit ?? 20;

        const conditions = [eq(activityLog.projectId, projectId)];
        if (since) {
          conditions.push(gt(activityLog.createdAt, new Date(since)));
        }

        const rows = await db
          .select()
          .from(activityLog)
          .where(and(...conditions))
          .orderBy(desc(activityLog.createdAt))
          .limit(pageSize);

        return toolResult({ activity: rows, count: rows.length });
      } catch (err) {
        return classifyError(err, 'activity_recent');
      }
    },
  );
}
