import { eq, and, sql, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  projects,
  projectMembers,
  activityLog,
  createId,
} from '@loomknot/shared/db';
import { slugify } from '@loomknot/shared/constants';
import { db } from '@/services/db.js';
import { toolResult, toolError, classifyError } from '@/utils/errors.js';
import { requireProjectMembership, requirePermission } from '@/utils/permissions.js';
import { projectUrl } from '@/utils/urls.js';

export function registerProjectTools(
  server: McpServer,
  userId: string,
  apiKeyId: string,
): void {
  // --- projects/list ---
  server.tool(
    'lk_projects_list',
    'Loomknot: list all your collaborative projects (trips, events, plans). Use lk_projects_get for full details.',
    {},
    async () => {
      try {
        const rows = await db
          .select({
            projectId: projectMembers.projectId,
            role: projectMembers.role,
            title: projects.title,
            slug: projects.slug,
            vertical: projects.vertical,
            isPublic: projects.isPublic,
            createdAt: projects.createdAt,
          })
          .from(projectMembers)
          .innerJoin(projects, and(eq(projects.id, projectMembers.projectId), isNull(projects.deletedAt)))
          .where(eq(projectMembers.userId, userId));

        return toolResult({
          projects: rows.map((r) => ({ ...r, url: projectUrl(r.projectId) })),
        });
      } catch (err) {
        return classifyError(err, 'lk_projects_list');
      }
    },
  );

  // --- projects/get ---
  server.tool(
    'lk_projects_get',
    'Loomknot: get collaborative project details — members, pages count, and memories count. Set includeContext=true to get full project context (large).',
    {
      projectId: z.string().describe('Project ID'),
      includeContext: z.boolean().optional().describe('Include full project context markdown (can be large). Default: false'),
    },
    async ({ projectId, includeContext }) => {
      try {
        await requireProjectMembership(userId, projectId);

        const baseColumns = {
          id: projects.id,
          slug: projects.slug,
          title: projects.title,
          description: projects.description,
          vertical: projects.vertical,
          summary: projects.summary,
          isPublic: projects.isPublic,
          ownerId: projects.ownerId,
          settings: projects.settings,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
        };

        const projectRows = await db
          .select(includeContext ? { ...baseColumns, context: projects.context } : baseColumns)
          .from(projects)
          .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
          .limit(1);

        if (projectRows.length === 0) {
          return toolError('NOT_FOUND', 'Project not found');
        }

        const project = projectRows[0];

        // Get members + counts in parallel
        const [members, [counts]] = await Promise.all([
          db
            .select({
              userId: projectMembers.userId,
              role: projectMembers.role,
              joinedAt: projectMembers.joinedAt,
            })
            .from(projectMembers)
            .where(eq(projectMembers.projectId, projectId)),
          db.execute<{
            page_count: number;
            memory_count: number;
          }>(sql`
            SELECT
              (SELECT count(*)::int FROM pages WHERE project_id = ${projectId} AND deleted_at IS NULL) as page_count,
              (SELECT count(*)::int FROM memories WHERE project_id = ${projectId} AND deleted_at IS NULL) as memory_count
          `),
        ]);

        return toolResult({
          ...project,
          members,
          pageCount: counts.page_count,
          memoryCount: counts.memory_count,
          url: projectUrl(projectId),
        });
      } catch (err) {
        return classifyError(err, 'lk_projects_get');
      }
    },
  );

  // --- projects/create ---
  server.tool(
    'lk_projects_create',
    'Loomknot: create a new collaborative project (e.g. a trip, event, renovation). You become the owner. An index page is auto-created inside the project.',
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

        // Insert project + member in a transaction
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
          url: projectUrl(projectId),
        });
      } catch (err) {
        return classifyError(err, 'lk_projects_create');
      }
    },
  );

  // --- projects/delete ---
  server.tool(
    'lk_projects_delete',
    'Loomknot: soft-delete a collaborative project. Only the project owner can delete it. The project can be restored later.',
    {
      projectId: z.string().describe('Project ID to delete'),
    },
    async ({ projectId }) => {
      try {
        await requirePermission(userId, projectId, 'canManageProject');

        // Verify ownership — only owner can delete
        const [project] = await db
          .select({ ownerId: projects.ownerId, title: projects.title })
          .from(projects)
          .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
          .limit(1);

        if (!project) {
          return toolError('NOT_FOUND', 'Project not found');
        }

        if (project.ownerId !== userId) {
          return toolError('FORBIDDEN', 'Only the project owner can delete the project');
        }

        await db
          .update(projects)
          .set({ deletedAt: new Date() })
          .where(eq(projects.id, projectId));

        // Log activity (fire-and-forget)
        db.insert(activityLog)
          .values({
            projectId,
            userId,
            apiKeyId,
            action: 'project.delete',
            targetType: 'project',
            targetId: projectId,
            metadata: { title: project.title },
          })
          .catch(() => {});

        return toolResult({ deleted: true, projectId });
      } catch (err) {
        return classifyError(err, 'lk_projects_delete');
      }
    },
  );

  // --- projects/update ---
  server.tool(
    'lk_projects_update',
    'Loomknot: update collaborative project settings (title, description, visibility). Requires project manager permission.',
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
        return classifyError(err, 'lk_projects_update');
      }
    },
  );
}
