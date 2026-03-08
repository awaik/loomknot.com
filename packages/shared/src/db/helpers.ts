import { randomBytes } from 'node:crypto';
import { customType, integer, timestamp, varchar } from 'drizzle-orm/pg-core';

/**
 * Time-sortable, collision-resistant ID (25 chars).
 * - 9-char base36 timestamp: lexicographic sort = chronological order (until ~5188 AD)
 * - 16-char hex random: 2^64 collision space per millisecond
 * - Fits varchar(36), no external dependencies
 */
export function createId(): string {
  const time = Date.now().toString(36).padStart(9, '0');
  const rand = randomBytes(8).toString('hex');
  return time + rand;
}

// Primary key column with time-sortable ID
export const uid = (name: string) =>
  varchar(name, { length: 36 })
    .notNull()
    .$defaultFn(() => createId());

export const pk = () => uid('id').primaryKey();

// Timestamps — EVERY mutable entity MUST use this
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// Soft delete — for recoverable entities (users, projects, pages, memories)
export const softDelete = {
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};

// Optimistic locking — for entities with concurrent access
export const versionColumn = {
  version: integer('version').notNull().default(1),
};

// pgvector custom type
export const vector = customType<{
  data: number[];
  driverData: string;
  config: { dimensions: number };
}>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`;
  },
  fromDriver(value: string): number[] {
    return value
      .slice(1, -1)
      .split(',')
      .map(Number);
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
});
