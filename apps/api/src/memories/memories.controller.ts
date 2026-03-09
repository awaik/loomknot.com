import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';
import { PermissionGuard, RequirePermission } from '../common/guards/permission.guard';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { SkipProjectGuard } from '../common/decorators/skip-project-guard.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { MemoriesService } from './memories.service';
import {
  bulkWriteSchema,
  createMemorySchema,
  listMemoriesQuerySchema,
  searchMemoriesQuerySchema,
  updateMemorySchema,
  type BulkWriteDto,
  type CreateMemoryDto,
  type ListMemoriesQuery,
  type SearchMemoriesQuery,
  type UpdateMemoryDto,
} from './memories.dto';

@Controller()
@UseGuards(ProjectMemberGuard, PermissionGuard)
export class MemoriesController {
  constructor(private readonly memoriesService: MemoriesService) {}

  @Post('projects/:id/memories')
  @RequirePermission('canEditMemory')
  async create(
    @ProjectId() projectId: string,
    @CurrentUser() user: RequestUser,
    @Param('id') _id: string,
    @Body(new ZodValidationPipe(createMemorySchema)) dto: CreateMemoryDto,
  ) {
    const memory = await this.memoriesService.create(projectId, user.id, dto);
    return { data: memory };
  }

  @Post('projects/:id/memories/bulk')
  @RequirePermission('canEditMemory')
  async bulkWrite(
    @ProjectId() projectId: string,
    @CurrentUser() user: RequestUser,
    @Param('id') _id: string,
    @Body(new ZodValidationPipe(bulkWriteSchema)) dto: BulkWriteDto,
  ) {
    const results = await this.memoriesService.bulkWrite(
      projectId,
      user.id,
      dto.items,
    );
    return { data: results };
  }

  @Get('projects/:id/memories')
  @RequirePermission('canView')
  async list(
    @ProjectId() projectId: string,
    @CurrentUser() user: RequestUser,
    @Param('id') _id: string,
    @Query(new ZodValidationPipe(listMemoriesQuerySchema))
    query: ListMemoriesQuery,
  ) {
    return this.memoriesService.list(projectId, user.id, query);
  }

  @Get('projects/:id/memories/search')
  @RequirePermission('canView')
  async search(
    @ProjectId() projectId: string,
    @CurrentUser() user: RequestUser,
    @Param('id') _id: string,
    @Query(new ZodValidationPipe(searchMemoriesQuerySchema))
    query: SearchMemoriesQuery,
  ) {
    return this.memoriesService.search(projectId, user.id, query);
  }
}

/**
 * Separate controller for individual memory operations (PATCH/DELETE by memoryId).
 * These routes are NOT project-scoped via header -- ownership is verified in the service.
 */
@Controller('memories')
@SkipProjectGuard()
@UseGuards(ProjectMemberGuard, PermissionGuard)
export class MemoryItemController {
  constructor(private readonly memoriesService: MemoriesService) {}

  @Patch(':memoryId')
  async update(
    @Param('memoryId') memoryId: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(updateMemorySchema)) dto: UpdateMemoryDto,
  ) {
    const memory = await this.memoriesService.update(memoryId, user.id, dto);
    return { data: memory };
  }

  @Delete(':memoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('memoryId') memoryId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.memoriesService.delete(memoryId, user.id);
  }
}
