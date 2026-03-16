import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export * from './schema';
export * from './helpers';

export function createDb(connectionString: string, poolOptions?: Partial<postgres.Options<{}>>) {
  const client = postgres(connectionString, {
    max: 20,
    idle_timeout: 30,
    connect_timeout: 10,
    max_lifetime: 1800,
    ...poolOptions,
  });
  return drizzle(client, { schema });
}

export type DrizzleDB = ReturnType<typeof createDb>;
