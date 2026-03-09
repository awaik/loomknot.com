import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NegotiationsService } from './negotiations.service';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';
import { PermissionGuard, RequirePermission } from '../common/guards/permission.guard';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  type ListNegotiationsQuery,
  listNegotiationsQuerySchema,
  type ProposeOptionDto,
  proposeOptionSchema,
  type VoteDto,
  voteSchema,
} from './negotiations.dto';

/**
 * Project-scoped negotiation list.
 */
@Controller('projects/:id/negotiations')
@UseGuards(ProjectMemberGuard, PermissionGuard)
export class ProjectNegotiationsController {
  constructor(private readonly negotiations: NegotiationsService) {}

  /**
   * List negotiations in the project.
   */
  @Get()
  @RequirePermission('canView')
  async list(
    @ProjectId() projectId: string,
    @Query(new ZodValidationPipe(listNegotiationsQuerySchema)) query: ListNegotiationsQuery,
  ) {
    return this.negotiations.list(projectId, query);
  }
}

/**
 * Negotiation-by-ID routes.
 * Require x-project-id header to verify the negotiation belongs to the project.
 */
@Controller('negotiations')
@UseGuards(ProjectMemberGuard, PermissionGuard)
export class NegotiationsController {
  constructor(private readonly negotiations: NegotiationsService) {}

  /**
   * Get a single negotiation with options and votes.
   */
  @Get(':negotiationId')
  @RequirePermission('canView')
  async get(
    @ProjectId() projectId: string,
    @Param('negotiationId') negotiationId: string,
  ) {
    return this.negotiations.get(negotiationId, projectId);
  }

  /**
   * Propose a new option for a negotiation.
   */
  @Post(':negotiationId/options')
  @RequirePermission('canEditMemory')
  async proposeOption(
    @ProjectId() projectId: string,
    @Param('negotiationId') negotiationId: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(proposeOptionSchema)) dto: ProposeOptionDto,
  ) {
    return this.negotiations.proposeOption(negotiationId, projectId, user.id, dto);
  }
}

/**
 * Voting on negotiation options.
 * Require x-project-id header to verify the option belongs to the project.
 */
@Controller('negotiation-options')
@UseGuards(ProjectMemberGuard, PermissionGuard)
export class NegotiationOptionsController {
  constructor(private readonly negotiations: NegotiationsService) {}

  /**
   * Vote on a negotiation option.
   */
  @Post(':optionId/vote')
  @RequirePermission('canView')
  async vote(
    @ProjectId() projectId: string,
    @Param('optionId') optionId: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(voteSchema)) dto: VoteDto,
  ) {
    return this.negotiations.vote(optionId, projectId, user.id, dto);
  }
}
