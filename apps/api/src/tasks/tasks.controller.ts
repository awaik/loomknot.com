import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  type CreateTaskDto,
  createTaskSchema,
  type UpdateTaskDto,
  updateTaskSchema,
  type ListTasksQuery,
  listTasksQuerySchema,
} from './tasks.dto';

/**
 * Tasks controller. User-level, JWT auth only (no ProjectMemberGuard).
 */
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  /**
   * Create a new task.
   */
  @Post()
  async create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createTaskSchema)) dto: CreateTaskDto,
  ) {
    return this.tasks.create(user.id, dto);
  }

  /**
   * List tasks with optional filters and cursor pagination.
   */
  @Get()
  async list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listTasksQuerySchema)) query: ListTasksQuery,
  ) {
    return this.tasks.list(user.id, query);
  }

  /**
   * Get a single task with its logs.
   */
  @Get(':id')
  async get(
    @Param('id') taskId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.tasks.get(taskId, user.id);
  }

  /**
   * Update task status, result, or add a log message.
   */
  @Patch(':id')
  async update(
    @Param('id') taskId: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(updateTaskSchema)) dto: UpdateTaskDto,
  ) {
    return this.tasks.update(taskId, user.id, dto);
  }
}
