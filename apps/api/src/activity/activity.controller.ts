import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { eq, desc, gte, and } from 'drizzle-orm';
import { Inject } from '@nestjs/common';
import { activityLog, users, type DrizzleDB } from '@loomknot/shared/db';
import { DATABASE_TOKEN } from '../database/database.provider';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';
import { PermissionGuard, RequirePermission } from '../common/guards/permission.guard';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

const activityQuerySchema = z.object({
  since: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

type ActivityQuery = z.infer<typeof activityQuerySchema>;

@Controller('projects/:id/activity')
@UseGuards(ProjectMemberGuard, PermissionGuard)
export class ActivityController {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: DrizzleDB) {}

  @Get()
  @RequirePermission('canView')
  async list(
    @ProjectId() projectId: string,
    @Param('id') _id: string,
    @Query(new ZodValidationPipe(activityQuerySchema)) query: ActivityQuery,
  ) {
    const since = query.since
      ? new Date(query.since)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    const entries = await this.db
      .select({
        id: activityLog.id,
        projectId: activityLog.projectId,
        userId: activityLog.userId,
        apiKeyId: activityLog.apiKeyId,
        action: activityLog.action,
        targetType: activityLog.targetType,
        targetId: activityLog.targetId,
        metadata: activityLog.metadata,
        createdAt: activityLog.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(activityLog)
      .leftJoin(users, eq(activityLog.userId, users.id))
      .where(
        and(
          eq(activityLog.projectId, projectId),
          gte(activityLog.createdAt, since),
        ),
      )
      .orderBy(desc(activityLog.createdAt))
      .limit(query.limit);

    return { data: entries };
  }
}
