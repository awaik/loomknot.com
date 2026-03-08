import { index, integer, jsonb, pgTable, text, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { pk, timestamps } from '../helpers';
import { negotiationOptionSourceEnum } from './enums';
import { negotiations } from './negotiations';
import { apiKeys } from './api-keys';
import { negotiationVotes } from './negotiation-votes';

export const negotiationOptions = pgTable(
  'negotiation_options',
  {
    id: pk(),
    negotiationId: varchar('negotiation_id', { length: 36 })
      .notNull()
      .references(() => negotiations.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    proposedValue: jsonb('proposed_value').notNull(),
    reasoning: text('reasoning'),
    source: negotiationOptionSourceEnum('source').notNull().default('agent'),
    apiKeyId: varchar('api_key_id', { length: 36 }).references(() => apiKeys.id, {
      onDelete: 'set null',
    }),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index('negotiation_options_negotiation_id_idx').on(table.negotiationId),
  ],
);

export const negotiationOptionsRelations = relations(negotiationOptions, ({ one, many }) => ({
  negotiation: one(negotiations, {
    fields: [negotiationOptions.negotiationId],
    references: [negotiations.id],
  }),
  apiKey: one(apiKeys, {
    fields: [negotiationOptions.apiKeyId],
    references: [apiKeys.id],
  }),
  votes: many(negotiationVotes),
}));
