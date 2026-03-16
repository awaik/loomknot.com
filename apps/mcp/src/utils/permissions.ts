import { eq, and } from 'drizzle-orm';
import { projectMembers } from '@loomknot/shared/db';
import { ROLE_PERMISSIONS, type Role, type Permission } from '@loomknot/shared/constants';
import { db } from '@/services/db.js';
import { McpToolError } from './errors.js';
import { TtlCache } from './ttl-cache.js';

const membershipCache = new TtlCache<Role>({ ttlMs: 10 * 60 * 1000, maxSize: 500 });

function cacheKey(userId: string, projectId: string): string {
  return `${userId}:${projectId}`;
}

/**
 * Check if user is a member of a project.
 * Returns the member's role or null if not a member.
 * Results are cached in-memory for 10 minutes.
 */
export async function checkProjectMembership(
  userId: string,
  projectId: string,
): Promise<Role | null> {
  const key = cacheKey(userId, projectId);
  const cached = membershipCache.get(key);
  if (cached) return cached;

  const member = await db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .limit(1);

  if (member.length === 0) {
    membershipCache.delete(key);
    return null;
  }

  const role = member[0].role as Role;
  membershipCache.set(key, role);

  return role;
}

/**
 * Check if a role has a specific permission.
 */
export function checkPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role][permission];
}

/**
 * Require user to be a member of the project.
 * Throws McpToolError(FORBIDDEN) if not a member.
 * Returns the member's role.
 */
export async function requireProjectMembership(
  userId: string,
  projectId: string,
): Promise<Role> {
  const role = await checkProjectMembership(userId, projectId);
  if (!role) {
    throw new McpToolError('FORBIDDEN', 'You are not a member of this project');
  }
  return role;
}

/**
 * Require user to have a specific permission in the project.
 * Throws McpToolError(FORBIDDEN) if not a member or lacks the permission.
 * Returns the member's role.
 */
export async function requirePermission(
  userId: string,
  projectId: string,
  permission: Permission,
): Promise<Role> {
  const role = await requireProjectMembership(userId, projectId);
  if (!checkPermission(role, permission)) {
    throw new McpToolError('FORBIDDEN', `You do not have ${permission} permission in this project`);
  }
  return role;
}

/**
 * Invalidate cached membership for a user/project pair (e.g. on role change or removal).
 */
export function invalidateMembershipCache(userId?: string, projectId?: string): void {
  if (userId && projectId) {
    membershipCache.delete(cacheKey(userId, projectId));
  } else {
    membershipCache.clear();
  }
}
