import { Module } from '@nestjs/common';

import {
  createNestLoggingModuleOptions,
  LoggerModule,
  ProfilingModule,
  TracingModule,
} from '@novu/application-generic';
import { SentryModule } from '@sentry/nestjs/setup';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { HealthModule } from './health/health.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import packageJson from '../package.json';

const modules = [
  SharedModule,
  HealthModule,
  WebhooksModule,
  TracingModule.register(packageJson.name, packageJson.version),
  ProfilingModule.register(packageJson.name),
  LoggerModule.forRoot(
    createNestLoggingModuleOptions({
      serviceName: packageJson.name,
      version: packageJson.version,
    })
  ),
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const providers: any[] = [AppService];

if (process.env.SENTRY_DSN) {
  modules.unshift(SentryModule.forRoot());
}

@Module({
  imports: modules,
  exports: [],
  controllers: [AppController],
  providers,
})
export class AppModule {}
