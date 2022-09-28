import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { version } from '../package.json';
import { RedisIoAdapter } from './shared/framework/redis.adapter';
import { AppModule } from './app.module';
import { CONTEXT_PATH } from './config';
import './config';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: `v${version}`,
  });
}

export async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(CONTEXT_PATH);

  app.enableCors({
    origin: '*',
    preflightContinue: false,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.useWebSocketAdapter(new RedisIoAdapter(app));

  await app.listen(process.env.PORT);
}
