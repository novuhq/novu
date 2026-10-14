import './instrument';
import { NestFactory } from '@nestjs/core';
import { getErrorInterceptor, Logger } from '@novu/application-generic';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { CONTEXT_PATH, validateEnv } from './config';
import { InMemoryIoAdapter } from './shared/framework/in-memory-io.adapter';
import { prepareAppInfra, startAppInfra } from './socket/services';

// Validate the ENV variables after launching SENTRY, so missing variables will report to sentry
validateEnv();

export async function bootstrap() {
  // abortOnError: false so init errors reach runWithHydratedSecrets instead of process.abort(), which drops New Relic data.
  const app = await NestFactory.create(AppModule, { bufferLogs: true, abortOnError: false });

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

  await app.listen(process.env.PORT as string);
}
