import { createDb, type DrizzleDB } from '@loomknot/shared/db';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://loomknot:loomknot_dev@localhost:43010/loomknot';

export const db: DrizzleDB = createDb(DATABASE_URL);
