import { integer, pgTable, text, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { pk, softDelete, timestamps, versionColumn } from '../helpers';
import { pageStatusEnum } from './enums';
import { projects } from './projects';
import { users } from './users';
import { pageBlocks } from './page-blocks';

export const pages = pgTable(
  'pages',
  {
    id: pk(),
    projectId: varchar('project_id', { length: 36 })
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 200 }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    status: pageStatusEnum('status').notNull().default('draft'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdBy: varchar('created_by', { length: 36 }).references(() => users.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
    ...versionColumn,
    ...softDelete,
  },
  (table) => [
    uniqueIndex('pages_project_slug_idx').on(table.projectId, table.slug),
  ],
);

export const pagesRelations = relations(pages, ({ one, many }) => ({
  project: one(projects, {
    fields: [pages.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [pages.createdBy],
    references: [users.id],
  }),
  blocks: many(pageBlocks),
}));
