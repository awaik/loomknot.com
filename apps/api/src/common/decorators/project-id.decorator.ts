import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';

export const ProjectId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.projectMember) {
      throw new ForbiddenException('Project context required');
    }
    return request.projectMember.projectId;
  },
);
