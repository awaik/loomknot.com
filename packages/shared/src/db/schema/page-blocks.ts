import { index, integer, jsonb, pgTable, text, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { pk, timestamps, versionColumn } from '../helpers';
import { pages } from './pages';

export const pageBlocks = pgTable(
  'page_blocks',
  {
    id: pk(),
    pageId: varchar('page_id', { length: 36 })
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    content: jsonb('content').notNull().default({}),
    agentData: jsonb('agent_data'),
    sourceMemoryIds: text('source_memory_ids').array(),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
    ...versionColumn,
  },
  (table) => [
    index('page_blocks_page_sort_idx').on(table.pageId, table.sortOrder),
  ],
);

export const pageBlocksRelations = relations(pageBlocks, ({ one }) => ({
  page: one(pages, {
    fields: [pageBlocks.pageId],
    references: [pages.id],
  }),
}));
