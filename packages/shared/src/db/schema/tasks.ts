import { index, jsonb, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { pk, timestamps } from '../helpers';
import { taskStatusEnum, taskPriorityEnum } from './enums';
import { users } from './users';
import { projects } from './projects';
import { taskLogs } from './task-logs';

export const tasks = pgTable(
  'tasks',
  {
    id: pk(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: varchar('project_id', { length: 36 }).references(() => projects.id, {
      onDelete: 'cascade',
    }),
    title: varchar('title', { length: 500 }).notNull(),
    prompt: text('prompt').notNull(),
    status: taskStatusEnum('status').notNull().default('pending'),
    priority: taskPriorityEnum('priority').notNull().default('normal'),
    result: jsonb('result'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('tasks_user_status_idx').on(table.userId, table.status),
    index('tasks_project_status_idx').on(table.projectId, table.status),
  ],
);

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  logs: many(taskLogs),
}));
