import './instrument';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getErrorInterceptor, Logger } from '@novu/application-generic';

import { AppModule } from './app.module';

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
