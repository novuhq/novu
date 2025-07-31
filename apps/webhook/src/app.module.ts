import { Module } from '@nestjs/common';

import { createNestLoggingModuleOptions, LoggerModule, TracingModule } from '@novu/application-generic';
import { SentryModule } from '@sentry/nestjs/setup';
import packageJson from '../package.json';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { SharedModule } from './shared/shared.module';
import { WebhooksModule } from './webhooks/webhooks.module';

const modules = [
  SharedModule,
  HealthModule,
  WebhooksModule,
  TracingModule.register(packageJson.name, packageJson.version),
  LoggerModule.forRoot(
    createNestLoggingModuleOptions({
      serviceName: packageJson.name,
      version: packageJson.version,
    })
  ),
];

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
