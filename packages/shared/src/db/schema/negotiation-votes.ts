import { pgTable, text, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { pk, timestamps } from '../helpers';
import { voteTypeEnum } from './enums';
import { negotiationOptions } from './negotiation-options';
import { users } from './users';

export const negotiationVotes = pgTable(
  'negotiation_votes',
  {
    id: pk(),
    optionId: varchar('option_id', { length: 36 })
      .notNull()
      .references(() => negotiationOptions.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    vote: voteTypeEnum('vote').notNull(),
    comment: text('comment'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('negotiation_votes_option_user_idx').on(table.optionId, table.userId),
  ],
);

export const negotiationVotesRelations = relations(negotiationVotes, ({ one }) => ({
  option: one(negotiationOptions, {
    fields: [negotiationVotes.optionId],
    references: [negotiationOptions.id],
  }),
  user: one(users, {
    fields: [negotiationVotes.userId],
    references: [users.id],
  }),
}));
