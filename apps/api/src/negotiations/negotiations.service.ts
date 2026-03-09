import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import {
  createId,
  negotiationOptions,
  negotiationVotes,
  negotiations,
  type DrizzleDB,
} from '@loomknot/shared/db';
import { DATABASE_TOKEN } from '../database/database.provider';
import { ActivityService } from '../activity/activity.service';
import type { ListNegotiationsQuery, ProposeOptionDto, VoteDto } from './negotiations.dto';

@Injectable()
export class NegotiationsService {
  private readonly logger = new Logger(NegotiationsService.name);

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: DrizzleDB,
    private readonly activity: ActivityService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * List negotiations in a project with optional status filter.
   */
  async list(projectId: string, query: ListNegotiationsQuery) {
    const conditions = [eq(negotiations.projectId, projectId)];

    if (query.status) {
      conditions.push(eq(negotiations.status, query.status));
    }

    return this.db
      .select()
      .from(negotiations)
      .where(and(...conditions))
      .orderBy(asc(negotiations.createdAt))
      .limit(100);
  }

  /**
   * Get a single negotiation with options and votes (nested).
   * Verifies the negotiation belongs to the given project.
   */
  async get(negotiationId: string, projectId: string) {
    const [negotiation] = await this.db
      .select()
      .from(negotiations)
      .where(eq(negotiations.id, negotiationId))
      .limit(1);

    if (!negotiation) {
      throw new NotFoundException('Negotiation not found');
    }

    if (negotiation.projectId !== projectId) {
      throw new ForbiddenException('Negotiation does not belong to this project');
    }

    const options = await this.db
      .select()
      .from(negotiationOptions)
      .where(eq(negotiationOptions.negotiationId, negotiationId))
      .orderBy(asc(negotiationOptions.sortOrder));

    const optionIds = options.map((o) => o.id);

    let votes: Array<typeof negotiationVotes.$inferSelect> = [];
    if (optionIds.length > 0) {
      votes = await this.db
        .select()
        .from(negotiationVotes)
        .where(inArray(negotiationVotes.optionId, optionIds));
    }

    // Group votes by optionId
    const votesByOption = new Map<string, Array<typeof negotiationVotes.$inferSelect>>();
    for (const vote of votes) {
      const existing = votesByOption.get(vote.optionId) ?? [];
      existing.push(vote);
      votesByOption.set(vote.optionId, existing);
    }

    return {
      ...negotiation,
      options: options.map((option) => ({
        ...option,
        votes: votesByOption.get(option.id) ?? [],
      })),
    };
  }

  /**
   * Propose a new option for a negotiation.
   */
  async proposeOption(
    negotiationId: string,
    projectId: string,
    userId: string,
    dto: ProposeOptionDto,
  ) {
    const [negotiation] = await this.db
      .select({ id: negotiations.id, projectId: negotiations.projectId })
      .from(negotiations)
      .where(eq(negotiations.id, negotiationId))
      .limit(1);

    if (!negotiation) {
      throw new NotFoundException('Negotiation not found');
    }

    if (negotiation.projectId !== projectId) {
      throw new ForbiddenException('Negotiation does not belong to this project');
    }

    // Get current max sortOrder
    const [maxOption] = await this.db
      .select({ sortOrder: negotiationOptions.sortOrder })
      .from(negotiationOptions)
      .where(eq(negotiationOptions.negotiationId, negotiationId))
      .orderBy(desc(negotiationOptions.sortOrder))
      .limit(1);

    const nextSortOrder = maxOption ? maxOption.sortOrder + 1 : 0;

    const [option] = await this.db
      .insert(negotiationOptions)
      .values({
        id: createId(),
        negotiationId,
        title: dto.title,
        description: dto.description ?? null,
        proposedValue: dto.proposedValue,
        reasoning: dto.reasoning ?? null,
        source: 'user',
        sortOrder: nextSortOrder,
      })
      .returning();

    this.activity
      .log({
        projectId,
        userId,
        action: 'negotiation.option_proposed',
        targetType: 'negotiation_option',
        targetId: option!.id,
        metadata: { negotiationId, title: dto.title },
      })
      .catch(() => {});

    this.eventEmitter.emit('negotiation.proposal', { projectId, option });

    return option;
  }

  /**
   * Vote on a negotiation option. Upserts (one vote per user per option).
   */
  async vote(
    optionId: string,
    projectId: string,
    userId: string,
    dto: VoteDto,
  ) {
    // Find the option and its negotiation to verify project scope
    const [option] = await this.db
      .select({
        id: negotiationOptions.id,
        negotiationId: negotiationOptions.negotiationId,
      })
      .from(negotiationOptions)
      .where(eq(negotiationOptions.id, optionId))
      .limit(1);

    if (!option) {
      throw new NotFoundException('Negotiation option not found');
    }

    const [negotiation] = await this.db
      .select({ projectId: negotiations.projectId })
      .from(negotiations)
      .where(eq(negotiations.id, option.negotiationId))
      .limit(1);

    if (!negotiation || negotiation.projectId !== projectId) {
      throw new ForbiddenException('Option does not belong to this project');
    }

    // Upsert vote (one vote per user per option)
    const [vote] = await this.db
      .insert(negotiationVotes)
      .values({
        id: createId(),
        optionId,
        userId,
        vote: dto.vote,
        comment: dto.comment ?? null,
      })
      .onConflictDoUpdate({
        target: [negotiationVotes.optionId, negotiationVotes.userId],
        set: {
          vote: dto.vote,
          comment: dto.comment ?? null,
        },
      })
      .returning();

    this.activity
      .log({
        projectId,
        userId,
        action: 'negotiation.voted',
        targetType: 'negotiation_vote',
        targetId: vote!.id,
        metadata: { optionId, vote: dto.vote },
      })
      .catch(() => {});

    this.eventEmitter.emit('negotiation.vote', { projectId, vote });

    return vote;
  }
}
