import './config';
import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/node';
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
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://localhost:5672'],
      queue: 'trigger_engine_queue',
      queueOptions: {
        durable: false,
      },
    },
  });

  app.listen(() => {
    console.log('STARTED MICROSERVICE');
  });
}
