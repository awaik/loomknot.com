import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  await app.register(fastifyCookie as any, {
    secret: process.env.COOKIE_SECRET || 'dev-cookie-secret',
  });

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:43001',
    credentials: true,
  });

  const port = process.env.PORT || 43002;
  await app.listen(port, '0.0.0.0');
}

bootstrap();
