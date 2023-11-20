import './config';
import 'newrelic';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { BullMqService, getErrorInterceptor, Logger } from '@novu/application-generic';

import { AppModule } from './app.module';
import { CONTEXT_PATH } from './config';
import { InMemoryIoAdapter } from './shared/framework/in-memory-io.adapter';

import { version } from '../package.json';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: `v${version}`,
  });
}

export async function bootstrap() {
  BullMqService.haveProInstalled();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const inMemoryAdapter = new InMemoryIoAdapter(app);
  await inMemoryAdapter.connectToInMemoryCluster();

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

  app.useWebSocketAdapter(inMemoryAdapter);

  await app.listen(process.env.PORT as string);
}
