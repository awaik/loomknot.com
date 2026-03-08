// Memory levels
export const MEMORY_LEVELS = ['private', 'project', 'public'] as const;

// API key prefix
export const API_KEY_PREFIX = 'lk_';

// Verticals (launch with travel, expand later)
export const VERTICALS = {
  travel: 'travel',
  wedding: 'wedding',
  renovation: 'renovation',
  education: 'education',
  events: 'events',
} as const;

// RBAC roles
export const ROLES = {
  owner: 'owner',
  admin: 'admin',
  editor: 'editor',
  member: 'member',
  viewer: 'viewer',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// Role permissions
export const ROLE_PERMISSIONS: Record<Role, {
  canManageProject: boolean;
  canManageMembers: boolean;
  canEditMemory: boolean;
  canCreateApiKey: boolean;
  canView: boolean;
}> = {
  owner:  { canManageProject: true,  canManageMembers: true,  canEditMemory: true,  canCreateApiKey: true,  canView: true },
  admin:  { canManageProject: true,  canManageMembers: true,  canEditMemory: true,  canCreateApiKey: true,  canView: true },
  editor: { canManageProject: false, canManageMembers: false, canEditMemory: true,  canCreateApiKey: true,  canView: true },
  member: { canManageProject: false, canManageMembers: false, canEditMemory: false, canCreateApiKey: true,  canView: true },
  viewer: { canManageProject: false, canManageMembers: false, canEditMemory: false, canCreateApiKey: false, canView: true },
} as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Memory limits
export const MAX_PRIVATE_MEMORIES = 500;
export const MAX_PROJECT_MEMORIES = 2000;

// MCP
export const MCP_PROTOCOL_VERSION = '2025-03-26';
