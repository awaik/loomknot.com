import { createDb, type DrizzleDB } from '@loomknot/shared/db';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://loomknot:loomknot_dev@localhost:43010/loomknot';

export const db: DrizzleDB = createDb(DATABASE_URL, {
  connection: {
    statement_timeout: 15_000,
    lock_timeout: 5_000,
    idle_in_transaction_session_timeout: 10_000,
  },
});
