import { CONTEXT_PATH } from './config';
import 'newrelic';
import '@sentry/tracing';

import helmet from 'helmet';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import * as passport from 'passport';
import * as compression from 'compression';
import { NestFactory, Reflector } from '@nestjs/core';
import * as bodyParser from 'body-parser';
import * as Sentry from '@sentry/node';
import { BullMqService, getErrorInterceptor, Logger as PinoLogger } from '@novu/application-generic';
import { ExpressAdapter } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { ResponseInterceptor } from './app/shared/framework/response.interceptor';
import { RolesGuard } from './app/auth/framework/roles.guard';
import { SubscriberRouteGuard } from './app/auth/framework/subscriber-route.guard';
import { validateEnv } from './config/env-validator';

import * as packageJson from '../package.json';
import { setupSwagger } from './app/shared/framework/swagger/swagger.controller';
import { corsOptionsDelegate } from './config/cors';

const extendedBodySizeRoutes = ['/v1/events', '/v1/notification-templates', '/v1/workflows', '/v1/layouts'];

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: `v${packageJson.version}`,
    ignoreErrors: ['Non-Error exception captured'],
    integrations: [
      // enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
    ],
  });
}

// Validate the ENV variables after launching SENTRY, so missing variables will report to sentry
validateEnv();

export async function bootstrap(expressApp?): Promise<INestApplication> {
  BullMqService.haveProInstalled();

  let rawBodyBuffer: undefined | (() => void) = undefined;
  let nestOptions: Record<string, boolean> = {};

  try {
    if (
      (process.env.NOVU_ENTERPRISE === 'true' && require('@novu/ee-billing')?.rawBodyBuffer) ||
      process.env.CI_EE_TEST === 'true'
    ) {
      rawBodyBuffer = require('@novu/ee-billing')?.rawBodyBuffer;
      nestOptions = {
        bodyParser: false,
        rawBody: true,
      };
    }
  } catch (e) {
    Logger.error(e, `Unexpected error while importing enterprise modules`, 'EnterpriseImport');
  }

  let app: INestApplication;
  if (expressApp) {
    app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), nestOptions);
  } else {
    app = await NestFactory.create(AppModule, { bufferLogs: true, ...nestOptions });
  }

  app.useLogger(app.get(PinoLogger));
  app.flushLogs();

  const server = app.getHttpServer();
  Logger.verbose(`Server timeout: ${server.timeout}`);
  server.keepAliveTimeout = 61 * 1000;
  Logger.verbose(`Server keepAliveTimeout: ${server.keepAliveTimeout / 1000}s `);
  server.headersTimeout = 65 * 1000;
  Logger.verbose(`Server headersTimeout: ${server.headersTimeout / 1000}s `);

  if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }

  app.use(helmet());
  app.enableCors(corsOptionsDelegate);

  app.setGlobalPrefix(CONTEXT_PATH + 'v1');

  app.use(passport.initialize());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      forbidUnknownValues: false,
    })
  );

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalInterceptors(getErrorInterceptor());

  app.useGlobalGuards(new RolesGuard(app.get(Reflector)));
  app.useGlobalGuards(new SubscriberRouteGuard(app.get(Reflector)));

  app.use(extendedBodySizeRoutes, bodyParser.json({ limit: '20mb' }));
  app.use(extendedBodySizeRoutes, bodyParser.urlencoded({ limit: '20mb', extended: true }));

  app.use(bodyParser.json({ verify: rawBodyBuffer }));
  app.use(bodyParser.urlencoded({ extended: true, verify: rawBodyBuffer }));

  app.use(compression());

  setupSwagger(app);

  Logger.log('BOOTSTRAPPED SUCCESSFULLY');

  if (expressApp) {
    await app.init();
  } else {
    await app.listen(process.env.PORT);
  }

  app.enableShutdownHooks();

  Logger.log(`Started application in NODE_ENV=${process.env.NODE_ENV} on port ${process.env.PORT}`);

  return app;
}
