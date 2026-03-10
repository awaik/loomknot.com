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
import { ProjectsService } from './projects.service';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';
import { PermissionGuard, RequirePermission } from '../common/guards/permission.guard';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  type CreateProjectDto,
  createProjectSchema,
  type UpdateProjectDto,
  updateProjectSchema,
  type CreateInviteDto,
  createInviteSchema,
} from './projects.dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  /**
   * Create a new project. The authenticated user becomes the owner.
   */
  @Post()
  async create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createProjectSchema)) dto: CreateProjectDto,
  ) {
    return this.projects.create(user.id, dto);
  }

  /**
   * List all projects where the authenticated user is a member.
   */
  @Get()
  async list(@CurrentUser() user: RequestUser) {
    return this.projects.listByUser(user.id);
  }

  /**
   * Get a single project with members, page count, and memory count.
   * Requires project membership (via x-project-id header).
   */
  @Get(':id')
  @UseGuards(ProjectMemberGuard)
  async get(@ProjectId() projectId: string) {
    return this.projects.getWithDetails(projectId);
  }

  /**
   * Update a project. Requires canManageProject permission.
   */
  @Patch(':id')
  @UseGuards(ProjectMemberGuard, PermissionGuard)
  @RequirePermission('canManageProject')
  async update(
    @ProjectId() projectId: string,
    @Body(new ZodValidationPipe(updateProjectSchema)) dto: UpdateProjectDto,
  ) {
    return this.projects.update(projectId, dto);
  }

  /**
   * Soft-delete a project. Owner only.
   */
  @Delete(':id')
  @UseGuards(ProjectMemberGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @ProjectId() projectId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.projects.softDelete(projectId, user.id);
  }

  /**
   * List members of a project.
   */
  @Get(':id/members')
  @UseGuards(ProjectMemberGuard)
  async listMembers(@ProjectId() projectId: string) {
    return this.projects.listMembers(projectId);
  }

  /**
   * Remove a member from a project. Requires canManageMembers permission.
   */
  @Delete(':id/members/:userId')
  @UseGuards(ProjectMemberGuard, PermissionGuard)
  @RequirePermission('canManageMembers')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @ProjectId() projectId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.projects.removeMember(projectId, targetUserId, user.id);
  }

  /**
   * List pending invites for a project. Requires canManageMembers permission.
   */
  @Get(':id/invites')
  @UseGuards(ProjectMemberGuard, PermissionGuard)
  @RequirePermission('canManageMembers')
  async listInvites(@ProjectId() projectId: string) {
    return this.projects.listInvites(projectId);
  }

  /**
   * Create an invite to join the project. Requires canManageMembers permission.
   */
  @Post(':id/invites')
  @UseGuards(ProjectMemberGuard, PermissionGuard)
  @RequirePermission('canManageMembers')
  async createInvite(
    @ProjectId() projectId: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createInviteSchema)) dto: CreateInviteDto,
  ) {
    return this.projects.createInvite(projectId, user.id, dto);
  }

  /**
   * Resend a pending invite. Requires canManageMembers permission.
   * 2-hour cooldown between resends.
   */
  @Post(':id/invites/:inviteId/resend')
  @UseGuards(ProjectMemberGuard, PermissionGuard)
  @RequirePermission('canManageMembers')
  @HttpCode(HttpStatus.OK)
  async resendInvite(
    @ProjectId() projectId: string,
    @Param('inviteId') inviteId: string,
  ) {
    return this.projects.resendInvite(projectId, inviteId);
  }
}

/**
 * Separate controller for invite acceptance (no project guard needed).
 */
@Controller('invites')
export class InvitesController {
  constructor(private readonly projects: ProjectsService) {}

  /**
   * Accept an invite by token. JWT auth only, no project membership required.
   */
  @Post(':token/accept')
  @HttpCode(HttpStatus.OK)
  async accept(
    @Param('token') token: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projects.acceptInvite(token, user.id);
  }
}
