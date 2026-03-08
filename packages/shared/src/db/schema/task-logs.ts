import { jsonb, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { pk } from '../helpers';
import { tasks } from './tasks';

export const taskLogs = pgTable('task_logs', {
  id: pk(),
  taskId: varchar('task_id', { length: 36 })
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const taskLogsRelations = relations(taskLogs, ({ one }) => ({
  task: one(tasks, {
    fields: [taskLogs.taskId],
    references: [tasks.id],
  }),
}));
