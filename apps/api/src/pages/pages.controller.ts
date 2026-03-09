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
  UseGuards,
} from '@nestjs/common';
import { PagesService } from './pages.service';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';
import { PermissionGuard, RequirePermission } from '../common/guards/permission.guard';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  type CreatePageDto,
  createPageSchema,
  type UpdatePageDto,
  updatePageSchema,
} from './pages.dto';

/**
 * Project-scoped page routes.
 * All routes require x-project-id header and project membership.
 */
@Controller('projects/:id/pages')
@UseGuards(ProjectMemberGuard, PermissionGuard)
export class ProjectPagesController {
  constructor(private readonly pages: PagesService) {}

  /**
   * Create a new page with blocks in the project.
   */
  @Post()
  @RequirePermission('canEditMemory')
  async create(
    @ProjectId() projectId: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createPageSchema)) dto: CreatePageDto,
  ) {
    return this.pages.create(projectId, user.id, dto);
  }

  /**
   * List all pages in the project (metadata only, no blocks).
   */
  @Get()
  @RequirePermission('canView')
  async list(@ProjectId() projectId: string) {
    return this.pages.list(projectId);
  }
}

/**
 * Page-by-ID routes.
 * Require x-project-id header to verify the page belongs to the project.
 */
@Controller('pages')
@UseGuards(ProjectMemberGuard, PermissionGuard)
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  /**
   * Get a single page with all blocks.
   */
  @Get(':pageId')
  async get(
    @ProjectId() projectId: string,
    @Param('pageId') pageId: string,
  ) {
    return this.pages.get(pageId, projectId);
  }

  /**
   * Update a page (title, blocks).
   */
  @Patch(':pageId')
  @RequirePermission('canEditMemory')
  async update(
    @ProjectId() projectId: string,
    @Param('pageId') pageId: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(updatePageSchema)) dto: UpdatePageDto,
  ) {
    return this.pages.update(pageId, projectId, user.id, dto);
  }

  /**
   * Soft-delete a page.
   */
  @Delete(':pageId')
  @RequirePermission('canEditMemory')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @ProjectId() projectId: string,
    @Param('pageId') pageId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.pages.delete(pageId, projectId, user.id);
  }
}
