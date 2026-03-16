import { createHash } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { apiKeys } from '@loomknot/shared/db';
import { API_KEY_PREFIX } from '@loomknot/shared/constants';
import { db } from '@/services/db.js';
import { TtlCache } from '@/utils/ttl-cache.js';

interface AuthResult {
  userId: string;
  apiKeyId: string;
}

const authCache = new TtlCache<AuthResult>({ ttlMs: 5 * 60 * 1000, maxSize: 500 });

/**
 * Authenticate an API key from the Authorization header.
 *
 * Expected format: `Bearer lk_...`
 * Computes SHA-256 hash of the raw key and looks it up in api_keys
 * where status = 'active'.
 *
 * Results are cached in-memory for 5 minutes to avoid hitting the DB
 * on every MCP request.
 *
 * On success, updates lastUsedAt (fire-and-forget) and returns userId + apiKeyId.
 * On failure, returns null.
 */
export async function authenticateApiKey(
  authHeader: string,
): Promise<AuthResult | null> {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  const rawKey = parts[1];
  if (!rawKey.startsWith(API_KEY_PREFIX)) return null;

  const keyHash = createHash('sha256').update(rawKey).digest('hex');

  // Check cache first
  const cached = authCache.get(keyHash);
  if (cached) return cached;

  const rows = await db
    .select({
      id: apiKeys.id,
      userId: apiKeys.userId,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.status, 'active')))
    .limit(1);

  if (rows.length === 0) return null;

  const { id: apiKeyId, userId } = rows[0];
  const result: AuthResult = { userId, apiKeyId };

  authCache.set(keyHash, result);

  // Update lastUsedAt (fire-and-forget, do not block the auth flow)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKeyId))
    .catch(() => {});

  return result;
}

/**
 * Invalidate cached auth for a specific API key hash.
 * Call this when an API key is revoked or deleted.
 */
export function invalidateAuthCache(keyHash?: string): void {
  if (keyHash) {
    authCache.delete(keyHash);
  } else {
    authCache.clear();
  }
}
