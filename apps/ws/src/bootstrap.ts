import './instrument';
import { NestFactory } from '@nestjs/core';
import { getErrorInterceptor, Logger, type NovuTlsConfig, toNovuTlsServerOptions } from '@novu/application-generic';
import { JobTopicNameEnum } from '@novu/shared';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { CONTEXT_PATH } from './config';
import { env, validateEnv, warnDeprecatedEnv } from './config/env';
import { InMemoryIoAdapter } from './shared/framework/in-memory-io.adapter';
import { prepareAppInfra, startAppInfra } from './socket/services';

/*
 * Validate the ENV variables after launching SENTRY, so missing variables will report to sentry.
 * Sockets are the only topic this service touches, and they never carry a
 * delay, so no scheduler config is required here.
 */
validateEnv({ topics: [JobTopicNameEnum.WEB_SOCKETS] });
warnDeprecatedEnv();

export async function bootstrap(tlsConfig?: NovuTlsConfig) {
  // abortOnError: false so init errors reach runWithHydratedSecrets instead of process.abort(), which drops New Relic data.
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    abortOnError: false,
    ...(tlsConfig && { httpsOptions: toNovuTlsServerOptions(tlsConfig) }),
  });

  const inMemoryAdapter = new InMemoryIoAdapter(app);
  await inMemoryAdapter.connectToInMemoryCluster();

  app.useLogger(app.get(Logger));
  app.flushLogs();

  await prepareAppInfra(app);

  app.useGlobalInterceptors(getErrorInterceptor());

  app.setGlobalPrefix(CONTEXT_PATH);

  app.use(helmet());

  app.enableCors({
    origin: '*',
    preflightContinue: false,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.useWebSocketAdapter(inMemoryAdapter);

  app.enableShutdownHooks();

  await app.init();

  await startAppInfra(app);

  await app.listen(env.PORT as string);

  app.get(Logger).log(`[@novu/ws]: Listening on port ${env.PORT} over ${tlsConfig ? 'https' : 'http'}`);
}
