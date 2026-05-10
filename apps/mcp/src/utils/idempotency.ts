import { createHash } from 'node:crypto';
import { and, eq, lt } from 'drizzle-orm';
import { z } from 'zod';
import { createId, idempotencyRequests } from '@loomknot/shared/db';
import { db } from '@/services/db.js';
import { McpToolError } from './errors.js';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type IdempotencyMetadata = {
  key: string;
  replayed: boolean;
};

interface RunIdempotentOptions {
  toolName: string;
  userId: string;
  apiKeyId: string;
  idempotencyKey?: string;
  args: unknown;
  resourceType?: string;
  getResourceId?: (data: unknown) => string | null | undefined;
}

const IDEMPOTENCY_RETENTION_MS = readPositiveIntEnv(
  'MCP_IDEMPOTENCY_RETENTION_MS',
  48 * 60 * 60 * 1000,
);
const IDEMPOTENCY_CLEANUP_INTERVAL_MS = readPositiveIntEnv(
  'MCP_IDEMPOTENCY_CLEANUP_INTERVAL_MS',
  60 * 60 * 1000,
);

export const idempotencyKeySchema = z
  .string()
  .min(8)
  .max(200)
  .regex(/^[A-Za-z0-9._:-]+$/)
  .optional()
  .describe(
    'Optional idempotency key for safe retries. Reuse the same unique key when retrying the same mutation after a timeout or lost response.',
  );

export async function runIdempotent<T>(
  options: RunIdempotentOptions,
  run: (tx: Transaction) => Promise<T>,
): Promise<T> {
  const { toolName, userId, apiKeyId, idempotencyKey } = options;

  if (!idempotencyKey) {
    // The callback always receives a transaction. This keeps mutation code
    // atomic even without a retry key, but it also means no-key calls use a
    // transaction instead of naked statements.
    return db.transaction((tx) => run(tx));
  }

  const requestHash = hashArgs(options.args);
  const requestId = createId();

  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(idempotencyRequests)
      .values({
        id: requestId,
        userId,
        apiKeyId,
        toolName,
        idempotencyKey,
        requestHash,
        status: 'in_progress',
      })
      .onConflictDoNothing({
        target: [
          idempotencyRequests.userId,
          idempotencyRequests.toolName,
          idempotencyRequests.idempotencyKey,
        ],
      })
      .returning({ id: idempotencyRequests.id });

    if (inserted.length === 0) {
      const [existing] = await tx
        .select()
        .from(idempotencyRequests)
        .where(
          and(
            eq(idempotencyRequests.userId, userId),
            eq(idempotencyRequests.toolName, toolName),
            eq(idempotencyRequests.idempotencyKey, idempotencyKey),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new McpToolError('RATE_LIMITED', 'Idempotency record is not visible yet; retry shortly');
      }

      if (existing.requestHash !== requestHash) {
        throw new McpToolError(
          'CONFLICT',
          'This idempotencyKey was already used with different arguments',
        );
      }

      if (existing.status !== 'completed' || existing.response === null) {
        throw new McpToolError('RATE_LIMITED', 'An identical mutation is still in progress');
      }

      return addIdempotencyMetadata(existing.response as T, {
        key: idempotencyKey,
        replayed: true,
      });
    }

    const data = addIdempotencyMetadata(await run(tx), {
      key: idempotencyKey,
      replayed: false,
    });

    await tx
      .update(idempotencyRequests)
      .set({
        status: 'completed',
        response: data,
        resourceType: options.resourceType ?? null,
        resourceId: options.getResourceId?.(data) ?? null,
      })
      .where(eq(idempotencyRequests.id, requestId));

    return data;
  });
}

export function startIdempotencyCleanup(): () => void {
  const cleanup = async () => {
    const cutoff = new Date(Date.now() - IDEMPOTENCY_RETENTION_MS);
    try {
      await db.delete(idempotencyRequests).where(lt(idempotencyRequests.createdAt, cutoff));
    } catch (err) {
      console.error('[MCP] idempotency cleanup failed:', err);
    }
  };

  const timer = setInterval(() => {
    cleanup().catch(() => {});
  }, IDEMPOTENCY_CLEANUP_INTERVAL_MS);
  timer.unref();

  cleanup().catch(() => {});
  return () => clearInterval(timer);
}

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function hashArgs(args: unknown): string {
  return createHash('sha256').update(stableStringify(stripUndefined(args))).digest('hex');
}

function addIdempotencyMetadata<T>(data: T, metadata: IdempotencyMetadata): T {
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    return {
      ...(data as Record<string, unknown>),
      _idempotency: metadata,
    } as T;
  }

  // Current MCP mutation tools return objects. If a future tool returns a
  // primitive, wrap it so _idempotency still has a stable home in the response.
  return {
    result: data,
    _idempotency: metadata,
  } as T;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));

  return `{${entries
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(',')}}`;
}

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, stripUndefined(item)]),
    );
  }
  return value;
}
