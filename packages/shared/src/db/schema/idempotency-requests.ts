import { index, jsonb, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { pk } from '../helpers';
import { users } from './users';
import { apiKeys } from './api-keys';

export const idempotencyRequests = pgTable(
  'idempotency_requests',
  {
    id: pk(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    apiKeyId: varchar('api_key_id', { length: 36 }).references(() => apiKeys.id, {
      onDelete: 'set null',
    }),
    toolName: varchar('tool_name', { length: 100 }).notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 200 }).notNull(),
    requestHash: varchar('request_hash', { length: 64 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('completed'),
    response: jsonb('response'),
    resourceType: varchar('resource_type', { length: 50 }),
    resourceId: varchar('resource_id', { length: 36 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('idempotency_requests_user_tool_key_idx').on(
      table.userId,
      table.toolName,
      table.idempotencyKey,
    ),
    index('idempotency_requests_created_idx').on(table.createdAt),
    index('idempotency_requests_resource_idx').on(table.resourceType, table.resourceId),
  ],
);
