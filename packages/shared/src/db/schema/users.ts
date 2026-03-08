import { boolean, integer, pgTable, text, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { pk, softDelete, timestamps } from '../helpers';
import { sessions } from './sessions';
import { projectMembers } from './project-members';
import { preferences } from './preferences';
import { apiKeys } from './api-keys';
import { tasks } from './tasks';

export const users = pgTable('users', {
  id: pk(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  tokenVersion: integer('token_version').notNull().default(0),
  onboardingDone: boolean('onboarding_done').notNull().default(false),
  ...timestamps,
  ...softDelete,
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  projectMembers: many(projectMembers),
  preferences: many(preferences),
  apiKeys: many(apiKeys),
  tasks: many(tasks),
}));
