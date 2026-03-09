import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { ActivityModule } from './activity/activity.module';
import { MemoriesModule } from './memories/memories.module';
import { PagesModule } from './pages/pages.module';
import { TasksModule } from './tasks/tasks.module';
import { NegotiationsModule } from './negotiations/negotiations.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { SocketModule } from './socket/socket.module';
import { ThrottlerProxyGuard } from './common/guards/throttler-proxy.guard';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
      },
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60_000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 600_000,
        limit: 100,
      },
    ]),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    RedisModule,
    AuthModule,
    ActivityModule,
    ProjectsModule,
    MemoriesModule,
    PagesModule,
    TasksModule,
    NegotiationsModule,
    ApiKeysModule,
    SocketModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerProxyGuard },
  ],
})
export class AppModule {}
