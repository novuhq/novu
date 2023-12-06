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
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { BullMqService, getErrorInterceptor, Logger as PinoLogger } from '@novu/application-generic';
import { ExpressAdapter } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { ResponseInterceptor } from './app/shared/framework/response.interceptor';
import { RolesGuard } from './app/auth/framework/roles.guard';
import { SubscriberRouteGuard } from './app/auth/framework/subscriber-route.guard';
import { validateEnv } from './config/env-validator';

import * as packageJson from '../package.json';
import { injectDocumentComponents } from './app/shared/framework/swagger';

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

  let app: INestApplication;
  if (expressApp) {
    app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
  } else {
    app = await NestFactory.create(AppModule, { bufferLogs: true });
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

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.use(compression());

  const options = new DocumentBuilder()
    .setTitle('Novu API')
    .setDescription('Novu REST API. Please see https://docs.novu.co/api-reference for more details.')
    .setVersion('1.0')
    .setContact('Novu Support', 'https://discord.gg/novu', 'support@novu.co')
    .setExternalDoc('Novu Documentation', 'https://docs.novu.co')
    .setTermsOfService('https://novu.co/terms')
    .setLicense('MIT', 'https://opensource.org/license/mit')
    .addServer(process.env.API_ROOT_URL)
    .addApiKey({
      type: 'apiKey',
      name: 'Authorization',
      in: 'header',
      description: 'API key authentication. Allowed headers-- "Authorization: ApiKey <api_key>".',
    })
    .addTag('Events')
    .addTag('Subscribers')
    .addTag('Topics')
    .addTag('Notification')
    .addTag('Integrations')
    .addTag('Layouts')
    .addTag('Workflows')
    .addTag('Notification Templates')
    .addTag('Workflow groups')
    .addTag('Changes')
    .addTag('Environments')
    .addTag('Inbound Parse')
    .addTag('Feeds')
    .addTag('Tenants')
    .addTag('Messages')
    .addTag('Organizations')
    .addTag('Execution Details')
    .build();
  const document = injectDocumentComponents(SwaggerModule.createDocument(app, options));

  SwaggerModule.setup('api', app, {
    ...document,
    info: {
      ...document.info,
      title: `DEPRECATED: ${document.info.title}. Use /openapi.{json,yaml} instead.`,
    },
  });
  SwaggerModule.setup('openapi', app, document, {
    jsonDocumentUrl: 'openapi.json',
    yamlDocumentUrl: 'openapi.yaml',
    explorer: process.env.NODE_ENV !== 'production',
  });

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

const corsOptionsDelegate = function (req, callback) {
  const corsOptions = {
    origin: false as boolean | string | string[],
    preflightContinue: false,
    maxAge: 86400,
    allowedHeaders: ['Content-Type', 'Authorization', 'sentry-trace'],
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  };

  if (['dev', 'test', 'local'].includes(process.env.NODE_ENV) || isWidgetRoute(req.url) || isBlueprintRoute(req.url)) {
    corsOptions.origin = '*';
  } else {
    corsOptions.origin = [process.env.FRONT_BASE_URL];
    if (process.env.WIDGET_BASE_URL) {
      corsOptions.origin.push(process.env.WIDGET_BASE_URL);
    }
  }
  callback(null, corsOptions);
};

function isWidgetRoute(url: string) {
  return url.startsWith('/v1/widgets');
}

function isBlueprintRoute(url: string) {
  return url.startsWith('/v1/blueprints');
}
