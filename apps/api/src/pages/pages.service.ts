import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomBytes } from 'node:crypto';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { slugify } from '@loomknot/shared/constants';
import {
  createId,
  pageBlocks,
  pages,
  type DrizzleDB,
} from '@loomknot/shared/db';
import { DATABASE_TOKEN } from '../database/database.provider';
import { ActivityService } from '../activity/activity.service';
import type { CreatePageDto, UpdatePageDto } from './pages.dto';

@Injectable()
export class PagesService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: DrizzleDB,
    private readonly activity: ActivityService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a page with blocks in a single transaction.
   */
  async create(projectId: string, userId: string, dto: CreatePageDto) {
    const slug = await this.ensureUniqueSlug(projectId, dto.slug ?? dto.title);

    const pageId = createId();

    await this.db.transaction(async (tx) => {
      await tx.insert(pages).values({
        id: pageId,
        projectId,
        slug,
        title: dto.title,
        description: dto.description ?? null,
        createdBy: userId,
      });

      if (dto.blocks.length > 0) {
        await tx.insert(pageBlocks).values(
          dto.blocks.map((block, index) => ({
            id: createId(),
            pageId,
            type: block.type,
            content: block.content,
            agentData: block.agentData ?? null,
            sourceMemoryIds: block.sourceMemoryIds ?? null,
            sortOrder: index,
          })),
        );
      }
    });

    this.activity
      .log({
        projectId,
        userId,
        action: 'page.created',
        targetType: 'page',
        targetId: pageId,
        metadata: { title: dto.title, slug },
      })
      .catch(() => {});

    const result = await this.findByIdWithBlocks(pageId);

    this.eventEmitter.emit('page.created', { projectId, page: result });

    return result;
  }

  /**
   * List all non-deleted pages in a project (metadata only, no blocks).
   */
  async list(projectId: string) {
    return this.db
      .select({
        id: pages.id,
        projectId: pages.projectId,
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
      .where(
        and(
          eq(pages.projectId, projectId),
          isNull(pages.deletedAt),
        ),
      )
      .orderBy(asc(pages.sortOrder), asc(pages.createdAt));
  }

  /**
   * Get a single page with all blocks.
   * Verifies the page belongs to the given project.
   */
  async get(pageId: string, projectId: string) {
    const page = await this.findByIdWithBlocks(pageId);

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    if (page.projectId !== projectId) {
      throw new ForbiddenException('Page does not belong to this project');
    }

    return page;
  }

  /**
   * Update a page: title, description, and block operations.
   * Block operations:
   *   - id + action:"delete" -> delete the block
   *   - id (no action)       -> update the block
   *   - no id                -> create a new block
   */
  async update(pageId: string, projectId: string, userId: string, dto: UpdatePageDto) {
    const existing = await this.findById(pageId);

    if (!existing) {
      throw new NotFoundException('Page not found');
    }

    if (existing.projectId !== projectId) {
      throw new ForbiddenException('Page does not belong to this project');
    }

    await this.db.transaction(async (tx) => {
      // Update page-level fields
      const pageUpdates: Record<string, unknown> = {};
      if (dto.title !== undefined) pageUpdates.title = dto.title;
      if (dto.description !== undefined) pageUpdates.description = dto.description;

      if (Object.keys(pageUpdates).length > 0) {
        await tx
          .update(pages)
          .set(pageUpdates)
          .where(eq(pages.id, pageId));
      }

      // Handle block operations
      if (dto.blocks && dto.blocks.length > 0) {
        const toDelete: string[] = [];
        const toUpdate: Array<{ id: string; data: Record<string, unknown> }> = [];
        const toCreate: Array<{
          type: string;
          content: Record<string, unknown>;
          agentData?: Record<string, unknown> | null;
          sourceMemoryIds?: string[] | null;
          sortOrder: number;
        }> = [];

        for (let i = 0; i < dto.blocks.length; i++) {
          const block = dto.blocks[i]!;

          if (block.id && block.action === 'delete') {
            toDelete.push(block.id);
          } else if (block.id) {
            const updates: Record<string, unknown> = {};
            if (block.type !== undefined) updates.type = block.type;
            if (block.content !== undefined) updates.content = block.content;
            if (block.agentData !== undefined) updates.agentData = block.agentData;
            if (block.sourceMemoryIds !== undefined) updates.sourceMemoryIds = block.sourceMemoryIds;
            updates.sortOrder = i;
            toUpdate.push({ id: block.id, data: updates });
          } else {
            if (!block.type) {
              throw new BadRequestException('New blocks must have a type');
            }
            toCreate.push({
              type: block.type,
              content: block.content ?? {},
              agentData: block.agentData ?? null,
              sourceMemoryIds: block.sourceMemoryIds ?? null,
              sortOrder: i,
            });
          }
        }

        // Delete blocks
        if (toDelete.length > 0) {
          await tx
            .delete(pageBlocks)
            .where(
              and(
                inArray(pageBlocks.id, toDelete),
                eq(pageBlocks.pageId, pageId),
              ),
            );
        }

        // Update existing blocks
        for (const item of toUpdate) {
          await tx
            .update(pageBlocks)
            .set(item.data)
            .where(
              and(
                eq(pageBlocks.id, item.id),
                eq(pageBlocks.pageId, pageId),
              ),
            );
        }

        // Create new blocks
        if (toCreate.length > 0) {
          await tx.insert(pageBlocks).values(
            toCreate.map((block) => ({
              id: createId(),
              pageId,
              type: block.type,
              content: block.content,
              agentData: block.agentData,
              sourceMemoryIds: block.sourceMemoryIds,
              sortOrder: block.sortOrder,
            })),
          );
        }
      }
    });

    this.activity
      .log({
        projectId,
        userId,
        action: 'page.updated',
        targetType: 'page',
        targetId: pageId,
      })
      .catch(() => {});

    const result = await this.findByIdWithBlocks(pageId);

    this.eventEmitter.emit('page.updated', { projectId, page: result });

    return result;
  }

  /**
   * Soft-delete a page.
   */
  async delete(pageId: string, projectId: string, userId: string, role: string) {
    if (role !== 'owner') {
      throw new ForbiddenException('Only the project owner can delete pages');
    }

    const existing = await this.findById(pageId);

    if (!existing) {
      throw new NotFoundException('Page not found');
    }

    if (existing.projectId !== projectId) {
      throw new ForbiddenException('Page does not belong to this project');
    }

    await this.db
      .update(pages)
      .set({ deletedAt: new Date() })
      .where(eq(pages.id, pageId));

    this.activity
      .log({
        projectId,
        userId,
        action: 'page.deleted',
        targetType: 'page',
        targetId: pageId,
        metadata: { title: existing.title },
      })
      .catch(() => {});

    this.eventEmitter.emit('page.deleted', { projectId, pageId });
  }

  // --- Private helpers ---

  private async findById(pageId: string) {
    const [page] = await this.db
      .select()
      .from(pages)
      .where(
        and(
          eq(pages.id, pageId),
          isNull(pages.deletedAt),
        ),
      )
      .limit(1);

    return page ?? null;
  }

  private async findByIdWithBlocks(pageId: string) {
    const [page] = await this.db
      .select()
      .from(pages)
      .where(
        and(
          eq(pages.id, pageId),
          isNull(pages.deletedAt),
        ),
      )
      .limit(1);

    if (!page) return null;

    const blocks = await this.db
      .select()
      .from(pageBlocks)
      .where(eq(pageBlocks.pageId, pageId))
      .orderBy(asc(pageBlocks.sortOrder));

    return { ...page, blocks };
  }

  private async ensureUniqueSlug(projectId: string, input: string): Promise<string> {
    const base = slugify(input, 200);

    const [existing] = await this.db
      .select({ id: pages.id })
      .from(pages)
      .where(
        and(
          eq(pages.projectId, projectId),
          eq(pages.slug, base),
        ),
      )
      .limit(1);

    if (!existing) return base;

    const suffix = randomBytes(4).toString('hex');
    return `${base.slice(0, 191)}-${suffix}`;
  }
}
