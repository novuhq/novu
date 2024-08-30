import './config/env.config';
import 'newrelic';
import '@sentry/tracing';

import helmet from 'helmet';
import { INestApplication, Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import bodyParser from 'body-parser';
import { init, Integrations, Handlers } from '@sentry/node';
import { BullMqService, getErrorInterceptor, Logger as PinoLogger } from '@novu/application-generic';
import { ExpressAdapter } from '@nestjs/platform-express';

import { validateEnv, CONTEXT_PATH, corsOptionsDelegate } from './config';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './app/shared/framework/response.interceptor';
import { SubscriberRouteGuard } from './app/auth/framework/subscriber-route.guard';

import packageJson from '../package.json';
import { setupSwagger } from './app/shared/framework/swagger/swagger.controller';

const passport = require('passport');
const compression = require('compression');

const extendedBodySizeRoutes = [
  '/v1/events',
  '/v1/notification-templates',
  '/v1/workflows',
  '/v1/layouts',
  '/v1/bridge/sync',
  '/v1/bridge/diff',
];

if (process.env.SENTRY_DSN) {
  init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: `v${packageJson.version}`,
    ignoreErrors: ['Non-Error exception captured'],
    integrations: [
      // enable HTTP calls tracing
      new Integrations.Http({ tracing: true }),
    ],
  });
}

// Validate the ENV variables after launching SENTRY, so missing variables will report to sentry
validateEnv();

export async function bootstrap(expressApp?): Promise<INestApplication> {
  BullMqService.haveProInstalled();

  let rawBodyBuffer: undefined | ((...args) => void);
  let nestOptions: Record<string, boolean> = {};

  if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
    rawBodyBuffer = (req, res, buffer, encoding): void => {
      if (buffer && buffer.length) {
        // eslint-disable-next-line no-param-reassign
        req.rawBody = Buffer.from(buffer);
      }
    };
    nestOptions = {
      bodyParser: false,
      rawBody: true,
    };
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
    app.use(Handlers.requestHandler());
    app.use(Handlers.tracingHandler());
  }

  app.use(helmet());
  app.enableCors(corsOptionsDelegate);

  app.setGlobalPrefix(`${CONTEXT_PATH}`);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  app.use(passport.initialize());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      forbidUnknownValues: false,
    })
  );

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalInterceptors(getErrorInterceptor());

  app.useGlobalGuards(new SubscriberRouteGuard(app.get(Reflector), app.get(PinoLogger)));

  app.use(extendedBodySizeRoutes, bodyParser.json({ limit: '20mb' }));
  app.use(extendedBodySizeRoutes, bodyParser.urlencoded({ limit: '20mb', extended: true }));

  app.use(bodyParser.json({ verify: rawBodyBuffer }));
  app.use(bodyParser.urlencoded({ extended: true, verify: rawBodyBuffer }));

  app.use(compression());

  await setupSwagger(app);

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
