import './instrument';

import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { BullMqService, getErrorInterceptor, Logger as PinoLogger } from '@novu/application-generic';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import { ResponseInterceptor } from './app/shared/response.interceptor';
import { prepareAppInfra, startAppInfra } from './app/workflow/services/cold-start.service';
import { AppModule } from './app.module';
import { CONTEXT_PATH, validateEnv } from './config';

const extendedBodySizeRoutes = ['/v1/events', '/v1/notification-templates', '/v1/layouts'];

// Validate the ENV variables after launching SENTRY, so missing variables will report to sentry
validateEnv();

export async function bootstrap(): Promise<INestApplication> {
  BullMqService.haveProInstalled();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  app.flushLogs();

  await prepareAppInfra(app);

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

  /*
   * Handle unhandled promise rejections
   * We explicitly crash the process on unhandled rejections as they indicate the application
   * is in an undefined state. NestJS can't handle these as they occur outside the event lifecycle.
   * According to Node.js docs, it's unsafe to resume normal operation after unhandled rejections.
   * We log these rejections with fatal level to ensure they are properly monitored and tracked.
   * See: https://nodejs.org/api/process.html#process_warning_using_uncaughtexception_correctly
   */
  process.on('unhandledRejection', (reason, promise) => {
    app.get(PinoLogger).fatal(
      {
        err: reason,
        message: 'Unhandled promise rejection',
        promise,
      },
      'Bootstrap'
    );
    process.exit(1);
  });

  await app.init();

  try {
    await startAppInfra(app);
  } catch (e) {
    Logger.error('[@novu/worker]: Failed to start app infra', e.message, e.start);
    process.exit(1);
  }

  await app.listen(process.env.PORT);

  Logger.log(`[@novu/worker]: Listening for NODE_ENV=${process.env.NODE_ENV} on port ${process.env.PORT}`);

  return app;
}
