import './config/env.config';
import 'newrelic';
import '@sentry/tracing';
import helmet from 'helmet';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import bodyParser from 'body-parser';
import { init, Integrations, Handlers } from '@sentry/node';
import { BullMqService, getErrorInterceptor, Logger as PinoLogger } from '@novu/application-generic';

import { validateEnv, CONTEXT_PATH } from './config';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './app/shared/response.interceptor';
import { prepareAppInfra, startAppInfra } from './app/workflow/services/cold-start.service';
import packageJson from '../package.json';

const extendedBodySizeRoutes = ['/v1/events', '/v1/notification-templates', '/v1/layouts'];

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

export async function bootstrap(): Promise<INestApplication> {
  BullMqService.haveProInstalled();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(PinoLogger));
  app.flushLogs();

  await prepareAppInfra(app);

  if (process.env.SENTRY_DSN) {
    app.use(Handlers.requestHandler());
    app.use(Handlers.tracingHandler());
  }

  app.use(helmet());

  app.setGlobalPrefix(`${CONTEXT_PATH}v1`);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      forbidUnknownValues: false,
    })
  );

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalInterceptors(getErrorInterceptor());

  app.use(extendedBodySizeRoutes, bodyParser.json({ limit: '20mb' }));
  app.use(extendedBodySizeRoutes, bodyParser.urlencoded({ limit: '20mb', extended: true }));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.enableShutdownHooks();

  Logger.log('BOOTSTRAPPED SUCCESSFULLY');

  await app.init();

  try {
    await startAppInfra(app);
  } catch (e) {
    process.exit(1);
  }

  await app.listen(process.env.PORT);

  Logger.log(`Started application in NODE_ENV=${process.env.NODE_ENV} on port ${process.env.PORT}`);

  return app;
}
