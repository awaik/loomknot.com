import { boolean, jsonb, pgTable, text, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { pk, softDelete, timestamps } from '../helpers';
import { users } from './users';
import { projectMembers } from './project-members';
import { pages } from './pages';
import { memories } from './memories';
import { invites } from './invites';
import { negotiations } from './negotiations';
import { tasks } from './tasks';

export const projects = pgTable('projects', {
  id: pk(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  vertical: varchar('vertical', { length: 50 }).notNull().default('general'),
  ownerId: varchar('owner_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  isPublic: boolean('is_public').notNull().default(false),
  settings: jsonb('settings').notNull().default({}),
  ...timestamps,
  ...softDelete,
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  members: many(projectMembers),
  pages: many(pages),
  memories: many(memories),
  invites: many(invites),
  negotiations: many(negotiations),
  tasks: many(tasks),
}));
