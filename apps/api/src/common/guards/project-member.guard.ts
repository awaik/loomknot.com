import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { and, eq, isNull } from 'drizzle-orm';
import { projectMembers, projects, type DrizzleDB } from '@loomknot/shared/db';
import { DATABASE_TOKEN } from '../../database/database.provider';
import { SKIP_PROJECT_GUARD_KEY } from '../decorators/skip-project-guard.decorator';

@Injectable()
export class ProjectMemberGuard implements CanActivate {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: DrizzleDB,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_PROJECT_GUARD_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const user = (request as any).user;

    if (!user?.id) {
      throw new ForbiddenException('Authentication required');
    }

    const projectId = request.headers['x-project-id'] as string | undefined;

    if (!projectId) {
      throw new ForbiddenException('Missing x-project-id header');
    }

    const [membership] = await this.db
      .select({
        projectId: projectMembers.projectId,
        userId: projectMembers.userId,
        role: projectMembers.role,
      })
      .from(projectMembers)
      .innerJoin(projects, eq(projects.id, projectMembers.projectId))
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, user.id),
          isNull(projects.deletedAt),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new ForbiddenException('Not a member of this project');
    }

    (request as any).projectMember = {
      projectId: membership.projectId,
      userId: membership.userId,
      role: membership.role,
    };

    return true;
  }
}
