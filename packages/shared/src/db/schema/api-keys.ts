import { index, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { pk, timestamps } from '../helpers';
import { apiKeyStatusEnum } from './enums';
import { users } from './users';
import { projects } from './projects';

export const apiKeys = pgTable(
  'api_keys',
  {
    id: pk(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: varchar('project_id', { length: 36 }).references(() => projects.id, {
      onDelete: 'cascade',
    }),
    keyHash: varchar('key_hash', { length: 255 }).notNull().unique(),
    keyPrefix: varchar('key_prefix', { length: 8 }).notNull(),
    label: varchar('label', { length: 255 }),
    status: apiKeyStatusEnum('status').notNull().default('active'),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('api_keys_user_id_idx').on(table.userId),
  ],
);

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [apiKeys.projectId],
    references: [projects.id],
  }),
}));
