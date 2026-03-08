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
  confidence: number;
  expiresAt?: string;
  embedding?: number[];
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
  preferences: UserPreference[];
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
  createdAt: string;
  updatedAt: string;
}

// User preferences
export type PreferenceImportance = 'must' | 'prefer' | 'nice_to_have';
export type PreferenceSource = 'explicit' | 'inferred' | 'agent';

export interface UserPreference {
  id: string;
  userId: string;
  category: string;
  key: string;
  value: unknown;
  importance: PreferenceImportance;
  negotiable: boolean;
  source: PreferenceSource;
  createdAt: string;
  updatedAt: string;
}

// Negotiation
export type NegotiationStatus = 'open' | 'resolved' | 'dismissed';
export type VoteType = 'approve' | 'reject' | 'neutral';

// Activity log
export type ActivityAction =
  | 'project.create'
  | 'memory.create' | 'memory.update' | 'memory.delete'
  | 'page.create' | 'page.update' | 'page.suggest'
  | 'preference.set'
  | 'negotiation.create' | 'negotiation.vote' | 'negotiation.resolve'
  | 'member.join' | 'member.leave'
  | 'apikey.create' | 'apikey.revoke';

// Socket.io events
export const EVENTS = {
  // Memory
  MEMORY_CREATED: 'memory:created',
  MEMORY_UPDATED: 'memory:updated',
  MEMORY_DELETED: 'memory:deleted',
  // Page
  PAGE_UPDATED: 'page:updated',
  PAGE_REGENERATED: 'page:regenerated',
  // Negotiation
  NEGOTIATION_STARTED: 'negotiation:started',
  NEGOTIATION_PROPOSAL: 'negotiation:proposal',
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
} as const;
