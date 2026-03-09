import { pgEnum } from 'drizzle-orm/pg-core';

// Roles
export const memberRoleEnum = pgEnum('member_role', [
  'owner',
  'admin',
  'editor',
  'member',
  'viewer',
]);

// Invites
export const inviteStatusEnum = pgEnum('invite_status', [
  'pending',
  'accepted',
  'expired',
]);

export const inviteRoleEnum = pgEnum('invite_role', [
  'editor',
  'member',
  'viewer',
]);

// Pages
export const pageStatusEnum = pgEnum('page_status', [
  'draft',
  'published',
  'archived',
]);

// Memory
export const memoryLevelEnum = pgEnum('memory_level', [
  'private',
  'project',
  'public',
]);

export const memorySourceEnum = pgEnum('memory_source', [
  'user',
  'agent',
  'negotiation',
  'system',
]);

// API Keys
export const apiKeyStatusEnum = pgEnum('api_key_status', [
  'active',
  'revoked',
]);

// Tasks
export const taskStatusEnum = pgEnum('task_status', [
  'pending',
  'in_progress',
  'done',
  'failed',
]);

export const taskPriorityEnum = pgEnum('task_priority', [
  'low',
  'normal',
  'high',
  'urgent',
]);

// Negotiations
export const negotiationStatusEnum = pgEnum('negotiation_status', [
  'open',
  'resolved',
  'dismissed',
]);

export const negotiationOptionSourceEnum = pgEnum('negotiation_option_source', [
  'agent',
  'user',
]);

export const voteTypeEnum = pgEnum('vote_type', [
  'approve',
  'reject',
  'neutral',
]);
