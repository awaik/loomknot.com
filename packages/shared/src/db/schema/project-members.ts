import { pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { pk, timestamps } from '../helpers';
import { memberRoleEnum } from './enums';
import { users } from './users';
import { projects } from './projects';

export const projectMembers = pgTable(
  'project_members',
  {
    id: pk(),
    projectId: varchar('project_id', { length: 36 })
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: memberRoleEnum('role').notNull().default('member'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('project_members_project_user_idx').on(table.projectId, table.userId),
  ],
);

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
}));
