import { Provider } from '@nestjs/common';
import { createDb, type DrizzleDB } from '@loomknot/shared/db';

export const DATABASE_TOKEN = Symbol('DATABASE');

export const databaseProvider: Provider<DrizzleDB> = {
  provide: DATABASE_TOKEN,
  useFactory: () => {
    const url =
      process.env.DATABASE_URL ??
      'postgresql://loomknot:loomknot_dev@localhost:43010/loomknot';
    return createDb(url);
  },
};
