import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { apiKeys, type DrizzleDB } from '@loomknot/shared/db';
import { API_KEY_PREFIX } from '@loomknot/shared/constants';
import { DATABASE_TOKEN } from '../database/database.provider';
import type { CreateApiKeyDto } from './api-keys.dto';

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: DrizzleDB,
  ) {}

  /**
   * Generate a new API key. Returns the full key ONCE (never stored in plaintext).
   * Stores SHA-256 hash and a display prefix.
   */
  async create(userId: string, dto: CreateApiKeyDto) {
    const rawKey = API_KEY_PREFIX + randomBytes(32).toString('hex');
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 12);

    const [apiKey] = await this.db
      .insert(apiKeys)
      .values({
        userId,
        projectId: dto.projectId ?? null,
        keyHash,
        keyPrefix,
        label: dto.label ?? null,
      })
      .returning({
        id: apiKeys.id,
        keyPrefix: apiKeys.keyPrefix,
        label: apiKeys.label,
        status: apiKeys.status,
        createdAt: apiKeys.createdAt,
      });

    return {
      ...apiKey,
      key: rawKey,
    };
  }

  /**
   * List all API keys for a user (no plaintext key, only prefix and metadata).
   */
  async list(userId: string) {
    return this.db
      .select({
        id: apiKeys.id,
        keyPrefix: apiKeys.keyPrefix,
        label: apiKeys.label,
        projectId: apiKeys.projectId,
        status: apiKeys.status,
        lastUsedAt: apiKeys.lastUsedAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(desc(apiKeys.createdAt));
  }

  /**
   * Revoke an API key. Verifies ownership before revoking.
   */
  async revoke(keyId: string, userId: string) {
    const [key] = await this.db
      .select({
        id: apiKeys.id,
        userId: apiKeys.userId,
        status: apiKeys.status,
      })
      .from(apiKeys)
      .where(eq(apiKeys.id, keyId))
      .limit(1);

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    if (key.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.db
      .update(apiKeys)
      .set({ status: 'revoked' })
      .where(eq(apiKeys.id, keyId));
  }
}
