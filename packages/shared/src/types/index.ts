// Memory levels
export type MemoryLevel = 'private' | 'project' | 'public';

// Memory source
export type MemorySource = 'user' | 'agent' | 'negotiation' | 'system';

// Memory entry
export interface MemoryEntry {
  id: string;
  projectId: string;
  userId?: string;
  level: MemoryLevel;
  category: string;
  key: string;
  value: unknown;
  summary?: string;
  source: MemorySource;
  apiKeyId?: string;
  createdAt: string;
  updatedAt: string;
}

// API Key — one key = one user = access to all their projects
export interface ApiKey {
  id: string;
  userId: string;
  keyPrefix: string;
  label?: string;
  status: 'active' | 'revoked';
  lastUsedAt?: string;
  createdAt: string;
}

// Page types
export type PageRenderMode = 'human' | 'agent';
export type PageStatus = 'draft' | 'published' | 'archived';

export interface PageContext {
  pageId: string;
  projectId: string;
  userId?: string;
  renderMode: PageRenderMode;
  memories: MemoryEntry[];
}

// Project
export interface Project {
  id: string;
  slug: string;
  title: string;
  description?: string;
  ownerId: string;
  vertical: string;
  isPublic: boolean;
  settings: Record<string, unknown>;
  context?: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

// Negotiation
export type NegotiationStatus = 'open' | 'resolved' | 'dismissed';
export type VoteType = 'approve' | 'reject' | 'neutral';

// Activity log
export type ActivityAction =
  | 'project.create' | 'project.update'
  | 'memory.create' | 'memory.update' | 'memory.delete' | 'memory.upsert' | 'memory.bulk_write'
  | 'page.create' | 'page.update' | 'page.suggest' | 'page.delete'
  | 'page.created' | 'page.updated' | 'page.deleted'
  | 'negotiation.create' | 'negotiation.vote' | 'negotiation.resolve'
  | 'negotiation.option_proposed' | 'negotiation.voted'
  | 'member.join' | 'member.leave'
  | 'apikey.create' | 'apikey.revoke'
  | 'task.create' | 'task.update';

// Paginated API response
export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// Socket.io events
export const EVENTS = {
  // Memory
  MEMORY_CREATED: 'memory:created',
  MEMORY_UPDATED: 'memory:updated',
  MEMORY_DELETED: 'memory:deleted',
  // Page
  PAGE_CREATED: 'page:created',
  PAGE_UPDATED: 'page:updated',
  PAGE_DELETED: 'page:deleted',
  PAGE_REGENERATED: 'page:regenerated',
  // Task
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  // Negotiation
  NEGOTIATION_STARTED: 'negotiation:started',
  NEGOTIATION_PROPOSAL: 'negotiation:proposal',
  NEGOTIATION_VOTED: 'negotiation:voted',
  NEGOTIATION_RESOLVED: 'negotiation:resolved',
  // Project
  PROJECT_UPDATED: 'project:updated',
  MEMBER_JOINED: 'member:joined',
  MEMBER_LEFT: 'member:left',
} as const;

export const ROOMS = {
  project: (id: string) => `project:${id}`,
  page: (id: string) => `page:${id}`,
  negotiation: (id: string) => `negotiation:${id}`,
  user: (id: string) => `user:${id}`,
} as const;
