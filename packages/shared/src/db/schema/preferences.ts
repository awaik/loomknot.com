import { boolean, index, jsonb, pgTable, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { pk, timestamps, versionColumn } from '../helpers';
import { preferenceImportanceEnum, preferenceSourceEnum } from './enums';
import { users } from './users';
import { projects } from './projects';

export const preferences = pgTable(
  'preferences',
  {
    id: pk(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // null = global user preference, set = project-specific preference
    projectId: varchar('project_id', { length: 36 }).references(() => projects.id, {
      onDelete: 'cascade',
    }),
    category: varchar('category', { length: 100 }).notNull(),
    key: varchar('key', { length: 255 }).notNull(),
    value: jsonb('value').notNull(),
    importance: preferenceImportanceEnum('importance').notNull().default('prefer'),
    negotiable: boolean('negotiable').notNull().default(true),
    source: preferenceSourceEnum('source').notNull().default('explicit'),
    ...timestamps,
    ...versionColumn,
  },
  (table) => [
    uniqueIndex('preferences_user_project_category_key_idx').on(
      table.userId,
      table.projectId,
      table.category,
      table.key,
    ),
    index('preferences_project_id_idx').on(table.projectId),
  ],
);

export const preferencesRelations = relations(preferences, ({ one }) => ({
  user: one(users, {
    fields: [preferences.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [preferences.projectId],
    references: [projects.id],
  }),
}));
