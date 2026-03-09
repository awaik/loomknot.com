import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, desc, eq, ilike, isNull, lt, or, sql } from 'drizzle-orm';
import {
  memories,
  projectMembers,
  projects,
  type DrizzleDB,
} from '@loomknot/shared/db';
import { ROLE_PERMISSIONS } from '@loomknot/shared/constants';
import { DATABASE_TOKEN } from '../database/database.provider';
import { ActivityService } from '../activity/activity.service';
import { ContextService } from './context.service';
import type {
  CreateMemoryDto,
  ListMemoriesQuery,
  SearchMemoriesQuery,
  UpdateMemoryDto,
} from './memories.dto';

@Injectable()
export class MemoriesService {
  private readonly logger = new Logger(MemoriesService.name);

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: DrizzleDB,
    private readonly activityService: ActivityService,
    private readonly contextService: ContextService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(projectId: string, userId: string, dto: CreateMemoryDto) {
    const [memory] = await this.db
      .insert(memories)
      .values({
        projectId,
        userId,
        category: dto.category,
        key: dto.key,
        value: dto.value,
        summary: dto.summary,
        level: dto.level,
        source: 'user',
      })
      .onConflictDoUpdate({
        target: [
          memories.projectId,
          memories.userId,
          memories.category,
          memories.key,
        ],
        set: {
          value: dto.value,
          summary: dto.summary,
          level: dto.level,
          version: sql`${memories.version} + 1`,
          deletedAt: null,
        },
      })
      .returning();

    void this.activityService.log({
      projectId,
      userId,
      action: 'memory.upsert',
      targetType: 'memory',
      targetId: memory.id,
      metadata: { category: dto.category, key: dto.key, level: dto.level },
    });

    void this.contextService
      .regenerate(projectId)
      .catch((err) =>
        this.logger.error(
          `Context regen failed: ${(err as Error).message}`,
          (err as Error).stack,
        ),
      );

    this.eventEmitter.emit('memory.created', { projectId, memory });

    return memory;
  }

  async bulkWrite(
    projectId: string,
    userId: string,
    items: CreateMemoryDto[],
  ) {
    const results = await this.db.transaction(async (tx) => {
      const inserted: Array<typeof memories.$inferSelect> = [];

      for (const dto of items) {
        const [memory] = await tx
          .insert(memories)
          .values({
            projectId,
            userId,
            category: dto.category,
            key: dto.key,
            value: dto.value,
            summary: dto.summary,
            level: dto.level,
            source: 'user',
          })
          .onConflictDoUpdate({
            target: [
              memories.projectId,
              memories.userId,
              memories.category,
              memories.key,
            ],
            set: {
              value: dto.value,
              summary: dto.summary,
              level: dto.level,
              version: sql`${memories.version} + 1`,
              deletedAt: null,
            },
          })
          .returning();

        inserted.push(memory);
      }

      return inserted;
    });

    void this.activityService.log({
      projectId,
      userId,
      action: 'memory.bulk_write',
      targetType: 'memory',
      targetId: projectId,
      metadata: { count: items.length },
    });

    void this.contextService
      .regenerate(projectId)
      .catch((err) =>
        this.logger.error(
          `Context regen failed: ${(err as Error).message}`,
          (err as Error).stack,
        ),
      );

    for (const memory of results) {
      this.eventEmitter.emit('memory.created', { projectId, memory });
    }

    return results;
  }

  async list(projectId: string, userId: string, query: ListMemoriesQuery) {
    const conditions = [
      eq(memories.projectId, projectId),
      isNull(memories.deletedAt),
    ];

    // Access control: private memories visible only to creator
    if (query.level === 'private') {
      conditions.push(eq(memories.level, 'private'));
      conditions.push(eq(memories.userId, userId));
    } else if (query.level === 'project' || query.level === 'public') {
      conditions.push(eq(memories.level, query.level));
    } else {
      // No level filter: show own private + all project/public
      conditions.push(
        or(
          and(eq(memories.level, 'private'), eq(memories.userId, userId)),
          eq(memories.level, 'project'),
          eq(memories.level, 'public'),
        )!,
      );
    }

    if (query.category) {
      conditions.push(eq(memories.category, query.category));
    }

    if (query.cursor) {
      conditions.push(lt(memories.id, query.cursor));
    }

    const data = await this.db
      .select()
      .from(memories)
      .where(and(...conditions))
      .orderBy(desc(memories.createdAt))
      .limit(query.limit + 1);

    const hasMore = data.length > query.limit;
    const items = hasMore ? data.slice(0, query.limit) : data;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return { data: items, nextCursor };
  }

  async search(projectId: string, userId: string, query: SearchMemoriesQuery) {
    const searchPattern = `%${query.query}%`;

    const conditions = [
      eq(memories.projectId, projectId),
      isNull(memories.deletedAt),
      // Access control: own private + all project/public
      or(
        and(eq(memories.level, 'private'), eq(memories.userId, userId)),
        eq(memories.level, 'project'),
        eq(memories.level, 'public'),
      )!,
      // Text search across summary, key, and category
      or(
        ilike(memories.summary, searchPattern),
        ilike(memories.key, searchPattern),
        ilike(memories.category, searchPattern),
      )!,
    ];

    if (query.category) {
      conditions.push(eq(memories.category, query.category));
    }

    const data = await this.db
      .select()
      .from(memories)
      .where(and(...conditions))
      .orderBy(desc(memories.createdAt))
      .limit(query.limit);

    return { data };
  }

  async update(memoryId: string, userId: string, dto: UpdateMemoryDto) {
    const [memory] = await this.db
      .select()
      .from(memories)
      .where(and(eq(memories.id, memoryId), isNull(memories.deletedAt)))
      .limit(1);

    if (!memory) {
      throw new NotFoundException('Memory not found');
    }

    // Ownership check: only the creator can update
    if (memory.userId !== userId) {
      throw new ForbiddenException('Only the memory creator can update it');
    }

    // Verify project membership and canEditMemory permission
    await this.verifyCanEditMemory(memory.projectId, userId);

    const updateData: Record<string, unknown> = {
      version: sql`${memories.version} + 1`,
    };

    if (dto.value !== undefined) {
      updateData.value = dto.value;
    }
    if (dto.summary !== undefined) {
      updateData.summary = dto.summary;
    }
    if (dto.level !== undefined) {
      updateData.level = dto.level;
    }

    const [updated] = await this.db
      .update(memories)
      .set(updateData)
      .where(eq(memories.id, memoryId))
      .returning();

    void this.activityService.log({
      projectId: memory.projectId,
      userId,
      action: 'memory.update',
      targetType: 'memory',
      targetId: memoryId,
      metadata: { category: memory.category, key: memory.key },
    });

    void this.contextService
      .regenerate(memory.projectId)
      .catch((err) =>
        this.logger.error(
          `Context regen failed: ${(err as Error).message}`,
          (err as Error).stack,
        ),
      );

    this.eventEmitter.emit('memory.updated', {
      projectId: memory.projectId,
      memory: updated,
    });

    return updated;
  }

  async delete(memoryId: string, userId: string) {
    const [memory] = await this.db
      .select()
      .from(memories)
      .where(and(eq(memories.id, memoryId), isNull(memories.deletedAt)))
      .limit(1);

    if (!memory) {
      throw new NotFoundException('Memory not found');
    }

    // Ownership check: only the creator can delete
    if (memory.userId !== userId) {
      throw new ForbiddenException('Only the memory creator can delete it');
    }

    // Verify project membership and canEditMemory permission
    await this.verifyCanEditMemory(memory.projectId, userId);

    // Soft delete
    await this.db
      .update(memories)
      .set({ deletedAt: new Date() })
      .where(eq(memories.id, memoryId));

    void this.activityService.log({
      projectId: memory.projectId,
      userId,
      action: 'memory.delete',
      targetType: 'memory',
      targetId: memoryId,
      metadata: { category: memory.category, key: memory.key },
    });

    void this.contextService
      .regenerate(memory.projectId)
      .catch((err) =>
        this.logger.error(
          `Context regen failed: ${(err as Error).message}`,
          (err as Error).stack,
        ),
      );

    this.eventEmitter.emit('memory.deleted', {
      projectId: memory.projectId,
      memoryId,
      level: memory.level,
      userId: memory.userId,
    });
  }

  private async verifyCanEditMemory(
    projectId: string,
    userId: string,
  ): Promise<void> {
    const [membership] = await this.db
      .select({ role: projectMembers.role })
      .from(projectMembers)
      .innerJoin(projects, eq(projects.id, projectMembers.projectId))
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId),
          isNull(projects.deletedAt),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new ForbiddenException('Not a member of this project');
    }

    const role = membership.role as keyof typeof ROLE_PERMISSIONS;
    if (!ROLE_PERMISSIONS[role]?.canEditMemory) {
      throw new ForbiddenException('Insufficient permissions to edit memories');
    }
  }
}
