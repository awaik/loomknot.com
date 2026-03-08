import { Global, Module } from '@nestjs/common';
import { REDIS_TOKEN, redisProvider } from './redis.provider';

@Global()
@Module({
  providers: [redisProvider],
  exports: [REDIS_TOKEN],
})
export class RedisModule {}
