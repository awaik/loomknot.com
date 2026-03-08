import { jsonb, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { pk, timestamps } from '../helpers';
import { negotiationStatusEnum } from './enums';
import { projects } from './projects';
import { users } from './users';
import { memories } from './memories';
import { negotiationOptions } from './negotiation-options';

export const negotiations = pgTable('negotiations', {
  id: pk(),
  projectId: varchar('project_id', { length: 36 })
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }).notNull(),
  status: negotiationStatusEnum('status').notNull().default('open'),
  conflictData: jsonb('conflict_data'),
  resolvedMemoryId: varchar('resolved_memory_id', { length: 36 }).references(
    () => memories.id,
    { onDelete: 'set null' },
  ),
  createdBy: varchar('created_by', { length: 36 }).references(() => users.id, {
    onDelete: 'set null',
  }),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  ...timestamps,
});

export const negotiationsRelations = relations(negotiations, ({ one, many }) => ({
  project: one(projects, {
    fields: [negotiations.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [negotiations.createdBy],
    references: [users.id],
  }),
  resolvedMemory: one(memories, {
    fields: [negotiations.resolvedMemoryId],
    references: [memories.id],
  }),
  options: many(negotiationOptions),
}));
