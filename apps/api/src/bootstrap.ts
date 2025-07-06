import './instrument';

import helmet from 'helmet';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import bodyParser from 'body-parser';

import {
  // eslint-disable-next-line no-restricted-imports
  Logger,
  BullMqService,
  getErrorInterceptor,
  PinoLogger,
  RequestLogRepository,
  FeatureFlagsService,
} from '@novu/application-generic';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './app/shared/framework/response.interceptor';
import { setupSwagger } from './app/shared/framework/swagger/swagger.controller';
import { CONTEXT_PATH, corsOptionsDelegate, validateEnv } from './config';
import { AllExceptionsFilter } from './exception-filter';

const passport = require('passport');
const compression = require('compression');

const extendedBodySizeRoutes = [
  '/v1/events',
  '/v1/notification-templates',
  '/v1/workflows',
  '/v1/layouts',
  '/v1/bridge/sync',
  '/v1/bridge/diff',
  '/v1/environments/:environmentId/bridge',
  '/v2/workflows',
];

// Validate the ENV variables after launching SENTRY, so missing variables will report to sentry.
validateEnv();
class BootstrapOptions {
  internalSdkGeneration?: boolean;
}

export async function bootstrap(
  bootstrapOptions?: BootstrapOptions
): Promise<{ app: INestApplication; document: any }> {
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

  const app = await NestFactory.create(AppModule, { bufferLogs: true, ...nestOptions });

  app.enableVersioning({
    type: VersioningType.URI,
    prefix: `${CONTEXT_PATH}v`,
    defaultVersion: '1',
  });

  const logger = await app.resolve(PinoLogger);
  logger.setContext('Bootstrap');

  app.useLogger(app.get(Logger));
  app.flushLogs();

  const server = app.getHttpServer();
  logger.trace(`Server timeout: ${server.timeout}`);
  server.keepAliveTimeout = 61 * 1000;
  logger.trace(`Server keepAliveTimeout: ${server.keepAliveTimeout / 1000}s `);
  server.headersTimeout = 65 * 1000;
  logger.trace(`Server headersTimeout: ${server.headersTimeout / 1000}s `);

  app.use(helmet());
  app.enableCors(corsOptionsDelegate);

  app.use(passport.initialize());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      forbidUnknownValues: false,
    })
  );

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalInterceptors(getErrorInterceptor());

  app.use(extendedBodySizeRoutes, bodyParser.json({ limit: '26mb' }));
  app.use(extendedBodySizeRoutes, bodyParser.urlencoded({ limit: '26mb', extended: true }));

  app.use(bodyParser.json({ verify: rawBodyBuffer }));
  app.use(bodyParser.urlencoded({ extended: true, verify: rawBodyBuffer }));

  app.use(compression());

  const document = await setupSwagger(app, bootstrapOptions?.internalSdkGeneration);

  app.useGlobalFilters(new AllExceptionsFilter(app.get(Logger), app.get(RequestLogRepository)));

  /*
   * Handle unhandled promise rejections
   * We explicitly crash the process on unhandled rejections as they indicate the application
   * is in an undefined state. NestJS can't handle these as they occur outside the event lifecycle.
   * According to Node.js docs, it's unsafe to resume normal operation after unhandled rejections.
   * We log these rejections with fatal level to ensure they are properly monitored and tracked.
   * See: https://nodejs.org/api/process.html#process_warning_using_uncaughtexception_correctly
   */
  process.on('unhandledRejection', (reason, promise) => {
    logger.fatal({
      err: reason,
      message: 'Unhandled promise rejection',
      promise,
    });
    process.exit(1);
  });

  await app.listen(process.env.PORT || 3000);

  app.enableShutdownHooks();

  logger.info(`Started application in NODE_ENV=${process.env.NODE_ENV} on port ${process.env.PORT}.`);

  return { app, document };
}
