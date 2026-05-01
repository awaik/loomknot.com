import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { IoAdapter } from '@nestjs/platform-socket.io';
import fastifyCookie from '@fastify/cookie';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { getCorsOrigin } from './config/cors';

async function bootstrap() {
  const adapter = new FastifyAdapter();
  adapter.getInstance().addHook('onRequest', (request, _reply, done) => {
    // Fastify trust proxy — extract real IP from X-Forwarded-For (behind Traefik)
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      (request as any).ips = forwarded.split(',').map((ip) => ip.trim());
    }
    done();
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    { bufferLogs: true },
  );

  await app.register(fastifyCookie as any, {
    secret: process.env.COOKIE_SECRET || 'dev-cookie-secret',
  });

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: getCorsOrigin(),
    credentials: true,
  });

  app.useWebSocketAdapter(new IoAdapter(app));

  const port = process.env.PORT || 43002;
  await app.listen(port, '0.0.0.0');
}

bootstrap();
