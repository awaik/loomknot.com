import { createHash } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { apiKeys } from '@loomknot/shared/db';
import { API_KEY_PREFIX } from '@loomknot/shared/constants';
import { db } from '@/services/db.js';

/**
 * Authenticate an API key from the Authorization header.
 *
 * Expected format: `Bearer lk_...`
 * Computes SHA-256 hash of the raw key and looks it up in api_keys
 * where status = 'active'.
 *
 * On success, updates lastUsedAt (fire-and-forget) and returns userId + apiKeyId.
 * On failure, returns null.
 */
export async function authenticateApiKey(
  authHeader: string,
): Promise<{ userId: string; apiKeyId: string } | null> {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  const rawKey = parts[1];
  if (!rawKey.startsWith(API_KEY_PREFIX)) return null;

  const keyHash = createHash('sha256').update(rawKey).digest('hex');

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

  // Update lastUsedAt (fire-and-forget, do not block the auth flow)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKeyId))
    .catch(() => {});

  return { userId, apiKeyId };
}
