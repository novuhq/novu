import './config';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { version } from '../package.json';
import { getErrorInterceptor, Logger } from '@novu/application-generic';

import { AppModule } from './app.module';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: `v${version}`,
  });
}

export async function bootstrap(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.flushLogs();

  app.useGlobalInterceptors(getErrorInterceptor());

  app.enableCors({
    origin: '*',
    preflightContinue: false,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  await app.listen(process.env.PORT);

  return app;
}
