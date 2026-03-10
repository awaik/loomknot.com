import { eq, and, sql, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  projects,
  projectMembers,
  pages,
  pageBlocks,
  activityLog,
  createId,
} from '@loomknot/shared/db';
import { slugify, INDEX_PAGE_SLUG } from '@loomknot/shared/constants';
import { db } from '@/services/db.js';
import { toolResult, toolError, McpToolError } from '@/utils/errors.js';
import { requireProjectMembership, requirePermission } from '@/utils/permissions.js';
import { projectUrl, pageUrl } from '@/utils/urls.js';

export function registerProjectTools(
  server: McpServer,
  userId: string,
  apiKeyId: string,
): void {
  // --- projects/list ---
  server.tool(
    'projects_list',
    'Loomknot: list all your projects with summaries, member count, and memory count.',
    {},
    async () => {
      try {
        const rows = await db
          .select({
            projectId: projectMembers.projectId,
            role: projectMembers.role,
            title: projects.title,
            slug: projects.slug,
            description: projects.description,
            vertical: projects.vertical,
            summary: projects.summary,
            isPublic: projects.isPublic,
            createdAt: projects.createdAt,
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
          .innerJoin(projects, and(eq(projects.id, projectMembers.projectId), isNull(projects.deletedAt)))
          .where(eq(projectMembers.userId, userId));

        return toolResult({
          projects: rows.map((r) => ({ ...r, url: projectUrl(r.projectId) })),
        });
      } catch (err) {
        if (err instanceof McpToolError) return toolError(err.code, err.message);
        console.error('projects_list error:', err);
        return toolError('INTERNAL', 'Failed to list projects');
      }
    },
  );

  // --- projects/get ---
  server.tool(
    'projects_get',
    'Loomknot: get project details — full context, members, pages count, and memories count.',
    { projectId: z.string().describe('Project ID') },
    async ({ projectId }) => {
      try {
        await requireProjectMembership(userId, projectId);

        const projectRows = await db
          .select()
          .from(projects)
          .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
          .limit(1);

        if (projectRows.length === 0) {
          return toolError('NOT_FOUND', 'Project not found');
        }

        const project = projectRows[0];

        // Get members with user info
        const members = await db
          .select({
            userId: projectMembers.userId,
            role: projectMembers.role,
            joinedAt: projectMembers.joinedAt,
          })
          .from(projectMembers)
          .where(eq(projectMembers.projectId, projectId));

        // Get counts via raw SQL subqueries for efficiency
        const [counts] = await db.execute<{
          page_count: number;
          memory_count: number;
        }>(sql`
          SELECT
            (SELECT count(*)::int FROM pages WHERE project_id = ${projectId} AND deleted_at IS NULL) as page_count,
            (SELECT count(*)::int FROM memories WHERE project_id = ${projectId} AND deleted_at IS NULL) as memory_count
        `);

        return toolResult({
          ...project,
          members,
          pageCount: counts.page_count,
          memoryCount: counts.memory_count,
          url: projectUrl(projectId),
        });
      } catch (err) {
        if (err instanceof McpToolError) return toolError(err.code, err.message);
        console.error('projects_get error:', err);
        return toolError('INTERNAL', 'Failed to get project');
      }
    },
  );

  // --- projects/create ---
  server.tool(
    'projects_create',
    'Loomknot: create a new project (e.g. a trip, event, renovation). You become the owner. An index page is auto-created inside the project.',
    {
      title: z.string().min(1).max(255).describe('Project title'),
      description: z.string().max(5000).optional().describe('Project description'),
      vertical: z
        .enum(['travel', 'wedding', 'renovation', 'education', 'events', 'general'])
        .optional()
        .describe('Project vertical (default: general)'),
    },
    async ({ title, description, vertical }) => {
      try {
        const projectId = createId();
        const slug = slugify(title);
        const indexPageId = createId();

        // Insert project + member + index page in a transaction
        await db.transaction(async (tx) => {
          await tx.insert(projects).values({
            id: projectId,
            slug,
            title,
            description: description ?? null,
            vertical: vertical ?? 'general',
            ownerId: userId,
          });

          await tx.insert(projectMembers).values({
            projectId,
            userId,
            role: 'owner',
          });

          // Create index page (project overview)
          await tx.insert(pages).values({
            id: indexPageId,
            projectId,
            slug: INDEX_PAGE_SLUG,
            title,
            status: 'published',
            sortOrder: 0,
            createdBy: userId,
          });

          if (description) {
            await tx.insert(pageBlocks).values({
              id: createId(),
              pageId: indexPageId,
              type: 'text',
              content: { text: description },
              sortOrder: 0,
            });
          }
        });

        // Log activity (fire-and-forget)
        db.insert(activityLog)
          .values({
            projectId,
            userId,
            apiKeyId,
            action: 'project.create',
            targetType: 'project',
            targetId: projectId,
            metadata: { title, slug },
          })
          .catch(() => {});

        return toolResult({
          projectId,
          slug,
          title,
          description: description ?? null,
          vertical: vertical ?? 'general',
          role: 'owner',
          indexPageId,
          url: projectUrl(projectId),
          indexPageUrl: pageUrl(projectId, indexPageId),
        });
      } catch (err) {
        if (err instanceof McpToolError) return toolError(err.code, err.message);
        console.error('projects_create error:', err);
        return toolError('INTERNAL', 'Failed to create project');
      }
    },
  );

  // --- projects/update ---
  server.tool(
    'projects_update',
    'Loomknot: update project settings (title, description, visibility). Requires project manager permission.',
    {
      projectId: z.string().describe('Project ID'),
      title: z.string().min(1).max(255).optional().describe('New project title'),
      description: z.string().max(5000).optional().describe('New description'),
      isPublic: z.boolean().optional().describe('Make project public or private'),
      settings: z.record(z.unknown()).optional().describe('Project settings object'),
    },
    async ({ projectId, title, description, isPublic, settings }) => {
      try {
        await requirePermission(userId, projectId, 'canManageProject');

        const updates: Record<string, unknown> = {};
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (isPublic !== undefined) updates.isPublic = isPublic;
        if (settings !== undefined) updates.settings = settings;

        if (Object.keys(updates).length === 0) {
          return toolError('VALIDATION', 'No fields to update');
        }

        const updated = await db
          .update(projects)
          .set(updates)
          .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
          .returning();

        if (updated.length === 0) {
          return toolError('NOT_FOUND', 'Project not found');
        }

        // Log activity (fire-and-forget)
        db.insert(activityLog)
          .values({
            projectId,
            userId,
            apiKeyId,
            action: 'project.update',
            targetType: 'project',
            targetId: projectId,
            metadata: { updated: Object.keys(updates) },
          })
          .catch(() => {});

        return toolResult({ ...updated[0], url: projectUrl(projectId) });
      } catch (err) {
        if (err instanceof McpToolError) return toolError(err.code, err.message);
        console.error('projects_update error:', err);
        return toolError('INTERNAL', 'Failed to update project');
      }
    },
  );
}
