import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_PERMISSIONS, type Permission, type Role } from '@loomknot/shared/constants';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

export const RequirePermission = (permission: Permission) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permission);

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.getAllAndOverride<Permission | undefined>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permission) return true;

    const request = context.switchToHttp().getRequest();
    const member = request.projectMember;

    if (!member) {
      throw new ForbiddenException('Project membership required');
    }

    const role = member.role as Role;
    const permissions = ROLE_PERMISSIONS[role];

    if (!permissions || !permissions[permission]) {
      throw new ForbiddenException(
        `Insufficient permissions: ${permission} required`,
      );
    }

    return true;
  }
}
