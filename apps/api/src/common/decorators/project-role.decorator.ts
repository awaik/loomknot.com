import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface RequestProjectMember {
  projectId: string;
  userId: string;
  role: string;
}

export const ProjectMember = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestProjectMember => {
    const request = ctx.switchToHttp().getRequest();
    return request.projectMember;
  },
);
