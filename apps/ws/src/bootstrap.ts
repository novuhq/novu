import './config';
import 'newrelic';
import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { RedisIoAdapter } from './shared/framework/redis.adapter';

import { AppModule } from './app.module';
import { CONTEXT_PATH } from './config';
import helmet from 'helmet';
import { BullmqService } from '@novu/application-generic';
import { version } from '../package.json';
import { getErrorInterceptor, Logger } from '@novu/application-generic';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: `v${version}`,
  });
}

export async function bootstrap() {
  BullmqService.haveProInstalled();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const redisIoAdapter = new RedisIoAdapter(app);

  app.useLogger(app.get(Logger));
  app.flushLogs();

  app.useGlobalInterceptors(getErrorInterceptor());

  app.setGlobalPrefix(CONTEXT_PATH);

  app.use(helmet());

  app.enableCors({
    origin: '*',
    preflightContinue: false,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.useWebSocketAdapter(redisIoAdapter);

  await app.listen(process.env.PORT as string);
}
