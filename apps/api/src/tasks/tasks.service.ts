import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, asc, desc, eq, isNull, lt } from 'drizzle-orm';
import {
  createId,
  projectMembers,
  projects,
  taskLogs,
  tasks,
  type DrizzleDB,
} from '@loomknot/shared/db';
import { DATABASE_TOKEN } from '../database/database.provider';
import { ActivityService } from '../activity/activity.service';
import type { CreateTaskDto, ListTasksQuery, UpdateTaskDto } from './tasks.dto';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: DrizzleDB,
    private readonly activity: ActivityService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new task for the authenticated user.
   */
  async create(userId: string, dto: CreateTaskDto) {
    // Verify project membership if projectId is provided
    if (dto.projectId) {
      const [membership] = await this.db
        .select({ id: projectMembers.id })
        .from(projectMembers)
        .innerJoin(projects, eq(projects.id, projectMembers.projectId))
        .where(
          and(
            eq(projectMembers.projectId, dto.projectId),
            eq(projectMembers.userId, userId),
            isNull(projects.deletedAt),
          ),
        )
        .limit(1);

      if (!membership) {
        throw new ForbiddenException('Not a member of this project');
      }
    }

    const [task] = await this.db
      .insert(tasks)
      .values({
        userId,
        projectId: dto.projectId ?? null,
        title: dto.title,
        prompt: dto.prompt,
        priority: dto.priority,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      })
      .returning();

    this.eventEmitter.emit('task.created', { userId, task });

    return task;
  }

  /**
   * List tasks for a user with optional filters and cursor pagination.
   * Ordered by createdAt desc, cursor by id.
   */
  async list(userId: string, query: ListTasksQuery) {
    const conditions = [eq(tasks.userId, userId)];

    if (query.status) {
      conditions.push(eq(tasks.status, query.status));
    }

    if (query.projectId) {
      conditions.push(eq(tasks.projectId, query.projectId));
    }

    if (query.cursor) {
      conditions.push(lt(tasks.id, query.cursor));
    }

    const rows = await this.db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.createdAt), desc(tasks.id))
      .limit(query.limit + 1);

    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1]!.id : null;

    return { items, nextCursor };
  }

  /**
   * Get a single task with its logs. Verifies ownership.
   */
  async get(taskId: string, userId: string) {
    const [task] = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const logs = await this.db
      .select()
      .from(taskLogs)
      .where(eq(taskLogs.taskId, taskId))
      .orderBy(asc(taskLogs.createdAt));

    return { ...task, logs };
  }

  /**
   * Update a task: status, result, and optional log message.
   * Sets completedAt when status becomes 'done'.
   */
  async update(taskId: string, userId: string, dto: UpdateTaskDto) {
    const [task] = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.db.transaction(async (tx) => {
      // Update task fields
      const updates: Record<string, unknown> = {};

      if (dto.status !== undefined) {
        updates.status = dto.status;

        if (dto.status === 'done') {
          updates.completedAt = new Date();
        }
      }

      if (dto.result !== undefined) {
        updates.result = dto.result;
      }

      if (Object.keys(updates).length > 0) {
        await tx
          .update(tasks)
          .set(updates)
          .where(eq(tasks.id, taskId));
      }

      // Insert log entry if provided
      if (dto.log) {
        await tx.insert(taskLogs).values({
          id: createId(),
          taskId,
          message: dto.log,
        });
      }
    });

    // Log activity if task is project-scoped
    if (task.projectId) {
      this.activity
        .log({
          projectId: task.projectId,
          userId,
          action: 'task.updated',
          targetType: 'task',
          targetId: taskId,
          metadata: { status: dto.status },
        })
        .catch(() => {});
    }

    const updatedTask = await this.get(taskId, userId);

    this.eventEmitter.emit('task.updated', { userId, task: updatedTask });

    return updatedTask;
  }
}
