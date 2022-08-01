import './config';
import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { RedisIoAdapter } from './shared/framework/redis.adapter';
import { version } from '../package.json';

import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: `v${version}`,
  });
}

export async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://localhost:5672'],
      queue: 'socket_queue',
      queueOptions: {
        durable: false,
      },
    },
  });

  app.enableCors({
    origin: '*',
    preflightContinue: false,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.useWebSocketAdapter(new RedisIoAdapter(app));

  await app.startAllMicroservices();
  await app.listen(process.env.PORT);
}
