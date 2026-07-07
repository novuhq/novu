import './instrument';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getErrorInterceptor, Logger } from '@novu/application-generic';
import { json } from 'express';
import type { IncomingMessage } from 'node:http';

import { AppModule } from './app.module';

const WEBHOOK_ROUTE_PATTERN =
  /^\/webhooks\/organizations\/[^/]+\/environments\/[^/]+\/(email|sms)\/[^/]+$/;

function isWebhookRoute(path: string, method: string): boolean {
  return method === 'POST' && WEBHOOK_ROUTE_PATTERN.test(path);
}

const captureRawBody = (req: IncomingMessage, _res: unknown, buffer: Buffer): void => {
  if (buffer?.length) {
    (req as IncomingMessage & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
  }
};

export async function bootstrap(): Promise<INestApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true, bodyParser: false });

  app.use((req, res, next) => {
    if (isWebhookRoute(req.path, req.method)) {
      return json({ verify: captureRawBody })(req, res, next);
    }

    return json()(req, res, next);
  });

  app.useLogger(app.get(Logger));
  app.flushLogs();

  app.useGlobalInterceptors(getErrorInterceptor());

  app.enableCors({
    origin: '*',
    preflightContinue: false,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.enableShutdownHooks();

  await app.listen(process.env.PORT);

  return app;
}
