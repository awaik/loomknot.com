import { eq, and, inArray, isNull, asc } from 'drizzle-orm';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  pages,
  pageBlocks,
  activityLog,
  createId,
} from '@loomknot/shared/db';
import { slugify, INDEX_PAGE_SLUG } from '@loomknot/shared/constants';
import { db } from '@/services/db.js';
import { toolResult, toolError, McpToolError } from '@/utils/errors.js';
import { requireProjectMembership, requirePermission } from '@/utils/permissions.js';
import { pageUrl } from '@/utils/urls.js';

const blockSchema = z.object({
  type: z.string().min(1).max(50).describe('Block type (e.g. "text", "heading", "image", "map", "list")'),
  content: z.record(z.unknown()).describe('Block content data'),
  agentData: z.record(z.unknown()).optional().describe('Agent-specific structured data'),
  sourceMemoryIds: z.array(z.string()).optional().describe('IDs of memories this block was generated from'),
  sortOrder: z.number().int().optional().describe('Sort order within the page'),
});

export function registerPageTools(
  server: McpServer,
  userId: string,
  apiKeyId: string,
): void {
  // --- pages/list ---
  server.tool(
    'pages_list',
    'Loomknot: list all pages in a project (metadata only, no content blocks).',
    {
      projectId: z.string().describe('Project ID'),
    },
    async ({ projectId }) => {
      try {
        await requireProjectMembership(userId, projectId);

        const rows = await db
          .select({
            id: pages.id,
            slug: pages.slug,
            title: pages.title,
            description: pages.description,
            status: pages.status,
            sortOrder: pages.sortOrder,
            createdBy: pages.createdBy,
            createdAt: pages.createdAt,
            updatedAt: pages.updatedAt,
          })
          .from(pages)
          .where(and(eq(pages.projectId, projectId), isNull(pages.deletedAt)))
          .orderBy(asc(pages.sortOrder), asc(pages.createdAt));

        return toolResult({
          pages: rows.map((row) => ({ ...row, url: pageUrl(projectId, row.id) })),
        });
      } catch (err) {
        if (err instanceof McpToolError) return toolError(err.code, err.message);
        console.error('pages_list error:', err);
        return toolError('INTERNAL', 'Failed to list pages');
      }
    },
  );

  // --- pages/get ---
  server.tool(
    'pages_get',
    'Loomknot: get a page with all its content blocks (text, headings, images, maps, lists).',
    {
      pageId: z.string().describe('Page ID'),
    },
    async ({ pageId }) => {
      try {
        const pageRows = await db
          .select()
          .from(pages)
          .where(and(eq(pages.id, pageId), isNull(pages.deletedAt)))
          .limit(1);

        if (pageRows.length === 0) {
          return toolError('NOT_FOUND', 'Page not found');
        }

        const page = pageRows[0];
        await requireProjectMembership(userId, page.projectId);

        const blocks = await db
          .select()
          .from(pageBlocks)
          .where(eq(pageBlocks.pageId, pageId))
          .orderBy(asc(pageBlocks.sortOrder));

        return toolResult({ ...page, blocks, url: pageUrl(page.projectId, pageId) });
      } catch (err) {
        if (err instanceof McpToolError) return toolError(err.code, err.message);
        console.error('pages_get error:', err);
        return toolError('INTERNAL', 'Failed to get page');
      }
    },
  );

  // --- pages/create ---
  server.tool(
    'pages_create',
    'Loomknot: create a new page inside a project with content blocks. Use for travel plans, checklists, itineraries, notes, etc.',
    {
      projectId: z.string().describe('Project ID'),
      title: z.string().min(1).max(500).describe('Page title'),
      slug: z.string().max(200).optional().describe('URL slug (auto-generated from title if omitted)'),
      description: z.string().max(2000).optional().describe('Page description'),
      status: z.enum(['draft', 'published', 'archived']).optional().describe('Page status (default: draft)'),
      blocks: z.array(blockSchema).optional().describe('Initial page blocks'),
    },
    async ({ projectId, title, slug, description, status, blocks }) => {
      try {
        await requirePermission(userId, projectId, 'canEditMemory');

        const pageSlug = slug ?? slugify(title);
        if (pageSlug === INDEX_PAGE_SLUG || slugify(pageSlug) === INDEX_PAGE_SLUG) {
          return toolError('VALIDATION', 'The slug "index" is reserved for the project overview page');
        }

        const pageId = createId();

        // Insert page
        const [page] = await db
          .insert(pages)
          .values({
            id: pageId,
            projectId,
            slug: pageSlug,
            title,
            description: description ?? null,
            status: status ?? 'draft',
            createdBy: userId,
          })
          .returning();

        // Insert blocks if provided
        let insertedBlocks: typeof pageBlocks.$inferSelect[] = [];
        if (blocks && blocks.length > 0) {
          insertedBlocks = await db
            .insert(pageBlocks)
            .values(
              blocks.map((block, index) => ({
                id: createId(),
                pageId,
                type: block.type,
                content: block.content,
                agentData: block.agentData ?? null,
                sourceMemoryIds: block.sourceMemoryIds ?? null,
                sortOrder: block.sortOrder ?? index,
              })),
            )
            .returning();
        }

        // Log activity (fire-and-forget)
        db.insert(activityLog)
          .values({
            projectId,
            userId,
            apiKeyId,
            action: 'page.create',
            targetType: 'page',
            targetId: pageId,
            metadata: { title, slug: pageSlug, blockCount: insertedBlocks.length },
          })
          .catch(() => {});

        return toolResult({ ...page, blocks: insertedBlocks, url: pageUrl(projectId, pageId) });
      } catch (err) {
        if (err instanceof McpToolError) return toolError(err.code, err.message);
        console.error('pages_create error:', err);
        return toolError('INTERNAL', 'Failed to create page');
      }
    },
  );

  // --- pages/update ---
  server.tool(
    'pages_update',
    'Loomknot: update a page and/or its content blocks. For blocks: include id to update existing, omit id to create new, set action:"delete" to remove.',
    {
      pageId: z.string().describe('Page ID'),
      title: z.string().min(1).max(500).optional().describe('New page title'),
      description: z.string().max(2000).optional().describe('New description'),
      status: z.enum(['draft', 'published', 'archived']).optional().describe('New status'),
      blocks: z
        .array(
          z.object({
            id: z.string().optional().describe('Block ID (omit for new blocks)'),
            action: z.enum(['delete']).optional().describe('Set to "delete" to remove this block'),
            type: z.string().min(1).max(50).optional(),
            content: z.record(z.unknown()).optional(),
            agentData: z.record(z.unknown()).optional(),
            sourceMemoryIds: z.array(z.string()).optional(),
            sortOrder: z.number().int().optional(),
          }),
        )
        .optional()
        .describe('Block operations: update (with id), create (without id), delete (with id + action:"delete")'),
    },
    async ({ pageId, title, description, status, blocks }) => {
      try {
        // Verify page exists and user has access
        const pageRows = await db
          .select()
          .from(pages)
          .where(and(eq(pages.id, pageId), isNull(pages.deletedAt)))
          .limit(1);

        if (pageRows.length === 0) {
          return toolError('NOT_FOUND', 'Page not found');
        }

        const page = pageRows[0];
        await requirePermission(userId, page.projectId, 'canEditMemory');

        // All mutations in a transaction for atomicity
        const pageUpdates: Record<string, unknown> = {};
        if (title !== undefined) pageUpdates.title = title;
        if (description !== undefined) pageUpdates.description = description;
        if (status !== undefined) pageUpdates.status = status;

        await db.transaction(async (tx) => {
          if (Object.keys(pageUpdates).length > 0) {
            await tx
              .update(pages)
              .set(pageUpdates)
              .where(eq(pages.id, pageId));
          }

          // Process block operations (batched by operation type)
          if (blocks && blocks.length > 0) {
            const toDelete: string[] = [];
            const toUpdate: Array<{ id: string; data: Record<string, unknown> }> = [];
            const toCreate: Array<typeof pageBlocks.$inferInsert> = [];

            for (const block of blocks) {
              if (block.id && block.action === 'delete') {
                toDelete.push(block.id);
              } else if (block.id) {
                const blockUpdates: Record<string, unknown> = {};
                if (block.type !== undefined) blockUpdates.type = block.type;
                if (block.content !== undefined) blockUpdates.content = block.content;
                if (block.agentData !== undefined) blockUpdates.agentData = block.agentData;
                if (block.sourceMemoryIds !== undefined) blockUpdates.sourceMemoryIds = block.sourceMemoryIds;
                if (block.sortOrder !== undefined) blockUpdates.sortOrder = block.sortOrder;
                if (Object.keys(blockUpdates).length > 0) {
                  toUpdate.push({ id: block.id, data: blockUpdates });
                }
              } else {
                toCreate.push({
                  id: createId(),
                  pageId,
                  type: block.type ?? 'text',
                  content: block.content ?? {},
                  agentData: block.agentData ?? null,
                  sourceMemoryIds: block.sourceMemoryIds ?? null,
                  sortOrder: block.sortOrder ?? 0,
                });
              }
            }

            if (toDelete.length > 0) {
              await tx.delete(pageBlocks).where(
                and(inArray(pageBlocks.id, toDelete), eq(pageBlocks.pageId, pageId)),
              );
            }

            for (const item of toUpdate) {
              await tx.update(pageBlocks).set(item.data).where(
                and(eq(pageBlocks.id, item.id), eq(pageBlocks.pageId, pageId)),
              );
            }

            if (toCreate.length > 0) {
              await tx.insert(pageBlocks).values(toCreate);
            }
          }
        });

        // Fetch updated page with blocks
        const updatedPage = await db
          .select()
          .from(pages)
          .where(eq(pages.id, pageId))
          .limit(1);

        const updatedBlocks = await db
          .select()
          .from(pageBlocks)
          .where(eq(pageBlocks.pageId, pageId))
          .orderBy(asc(pageBlocks.sortOrder));

        // Log activity (fire-and-forget)
        db.insert(activityLog)
          .values({
            projectId: page.projectId,
            userId,
            apiKeyId,
            action: 'page.update',
            targetType: 'page',
            targetId: pageId,
            metadata: {
              updatedFields: Object.keys(pageUpdates),
              blockOps: blocks?.length ?? 0,
            },
          })
          .catch(() => {});

        return toolResult({ ...updatedPage[0], blocks: updatedBlocks, url: pageUrl(page.projectId, pageId) });
      } catch (err) {
        if (err instanceof McpToolError) return toolError(err.code, err.message);
        console.error('pages_update error:', err);
        return toolError('INTERNAL', 'Failed to update page');
      }
    },
  );

  // --- pages/delete ---
  server.tool(
    'pages_delete',
    'Loomknot: delete a page from a project. The index page cannot be deleted.',
    {
      pageId: z.string().describe('Page ID to delete'),
    },
    async ({ pageId }) => {
      try {
        const pageRows = await db
          .select()
          .from(pages)
          .where(and(eq(pages.id, pageId), isNull(pages.deletedAt)))
          .limit(1);

        if (pageRows.length === 0) {
          return toolError('NOT_FOUND', 'Page not found');
        }

        const page = pageRows[0];
        await requirePermission(userId, page.projectId, 'canEditMemory');

        if (page.slug === INDEX_PAGE_SLUG) {
          return toolError('FORBIDDEN', 'Cannot delete the project index page');
        }

        await db
          .update(pages)
          .set({ deletedAt: new Date() })
          .where(eq(pages.id, pageId));

        // Log activity (fire-and-forget)
        db.insert(activityLog)
          .values({
            projectId: page.projectId,
            userId,
            apiKeyId,
            action: 'page.delete',
            targetType: 'page',
            targetId: pageId,
            metadata: { title: page.title },
          })
          .catch(() => {});

        return toolResult({ deleted: true, pageId });
      } catch (err) {
        if (err instanceof McpToolError) return toolError(err.code, err.message);
        console.error('pages_delete error:', err);
        return toolError('INTERNAL', 'Failed to delete page');
      }
    },
  );
}
