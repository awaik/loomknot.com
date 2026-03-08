import { Provider, Logger } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_TOKEN = Symbol('REDIS');

export const redisProvider: Provider<Redis> = {
  provide: REDIS_TOKEN,
  useFactory: () => {
    const logger = new Logger('Redis');
    const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:43011', {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redis.on('connect', () => logger.log('Connected'));
    redis.on('error', (err) => logger.error('Connection error', err.message));

    redis.connect().catch((err) => {
      logger.error('Failed to connect', err.message);
    });

    return redis;
  },
};
