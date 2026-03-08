import { index, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { pk, timestamps } from '../helpers';
import { inviteStatusEnum, inviteRoleEnum } from './enums';
import { projects } from './projects';
import { users } from './users';

export const invites = pgTable(
  'invites',
  {
    id: pk(),
    projectId: varchar('project_id', { length: 36 })
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    invitedBy: varchar('invited_by', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    role: inviteRoleEnum('role').notNull().default('member'),
    token: varchar('token', { length: 64 }).notNull().unique(),
    status: inviteStatusEnum('status').notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('invites_project_status_idx').on(table.projectId, table.status),
    index('invites_email_status_idx').on(table.email, table.status),
  ],
);

export const invitesRelations = relations(invites, ({ one }) => ({
  project: one(projects, {
    fields: [invites.projectId],
    references: [projects.id],
  }),
  inviter: one(users, {
    fields: [invites.invitedBy],
    references: [users.id],
  }),
}));
