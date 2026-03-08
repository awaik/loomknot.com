import { index, jsonb, pgTable, real, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { pk, softDelete, timestamps, versionColumn, vector } from '../helpers';
import { memoryLevelEnum, memorySourceEnum } from './enums';
import { projects } from './projects';
import { users } from './users';
import { apiKeys } from './api-keys';

export const memories = pgTable(
  'memories',
  {
    id: pk(),
    projectId: varchar('project_id', { length: 36 })
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 36 }).references(() => users.id, {
      onDelete: 'set null',
    }),
    level: memoryLevelEnum('level').notNull().default('private'),

    // Content
    category: varchar('category', { length: 100 }).notNull(),
    key: varchar('key', { length: 255 }).notNull(),
    value: jsonb('value').notNull(),
    summary: text('summary'),

    // Metadata
    source: memorySourceEnum('source').notNull().default('user'),
    apiKeyId: varchar('api_key_id', { length: 36 }).references(() => apiKeys.id, {
      onDelete: 'set null',
    }),
    confidence: real('confidence').notNull().default(1.0),
    expiresAt: timestamp('expires_at', { withTimezone: true }),

    // Vector
    embedding: vector('embedding', { dimensions: 1536 }),

    ...timestamps,
    ...versionColumn,
    ...softDelete,
  },
  (table) => [
    index('memories_project_level_idx').on(table.projectId, table.level),
    index('memories_project_user_level_idx').on(table.projectId, table.userId, table.level),
    index('memories_project_category_idx').on(table.projectId, table.category),
    index('memories_user_level_idx').on(table.userId, table.level),
    // HNSW index for vector similarity search (cosine distance)
    index('memories_embedding_idx')
      .using('hnsw', sql`embedding vector_cosine_ops`),
  ],
);

export const memoriesRelations = relations(memories, ({ one }) => ({
  project: one(projects, {
    fields: [memories.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [memories.userId],
    references: [users.id],
  }),
  apiKey: one(apiKeys, {
    fields: [memories.apiKeyId],
    references: [apiKeys.id],
  }),
}));
