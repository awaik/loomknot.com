import { index, jsonb, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { pk } from '../helpers';
import { projects } from './projects';
import { users } from './users';
import { apiKeys } from './api-keys';

export const activityLog = pgTable(
  'activity_log',
  {
    id: pk(),
    projectId: varchar('project_id', { length: 36 })
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 36 }).references(() => users.id, {
      onDelete: 'set null',
    }),
    apiKeyId: varchar('api_key_id', { length: 36 }).references(() => apiKeys.id, {
      onDelete: 'set null',
    }),
    action: varchar('action', { length: 50 }).notNull(),
    targetType: varchar('target_type', { length: 50 }).notNull(),
    targetId: varchar('target_id', { length: 36 }).notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('activity_log_project_created_idx').on(table.projectId, table.createdAt),
    index('activity_log_target_idx').on(table.targetType, table.targetId),
    index('activity_log_user_id_idx').on(table.userId),
    // Standalone index on created_at for retention cleanup and future partitioning
    index('activity_log_created_at_idx').on(table.createdAt),
  ],
);

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  project: one(projects, {
    fields: [activityLog.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
  apiKey: one(apiKeys, {
    fields: [activityLog.apiKeyId],
    references: [apiKeys.id],
  }),
}));
