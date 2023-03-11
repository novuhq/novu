import './config';
import 'newrelic';
import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { RedisIoAdapter } from './shared/framework/redis.adapter';
import { version } from '../package.json';

import { AppModule } from './app.module';
import { CONTEXT_PATH } from './config';
import helmet from 'helmet';
import { getOTELSDK } from '@novu/application-generic';
import * as packageJson from '../package.json';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: `v${version}`,
  });
}

const otelSDK = getOTELSDK(packageJson.name);

export async function bootstrap() {
  await otelSDK.start();

  const app = await NestFactory.create(AppModule);
  const redisIoAdapter = new RedisIoAdapter(app);

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

// gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  otelSDK
    .shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});
