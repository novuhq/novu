import { Module } from '@nestjs/common';
import { RavenInterceptor, RavenModule } from 'nest-raven';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { HealthModule } from './health/health.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import {
  createNestLoggingModuleOptions,
  LoggerModule,
  ProfilingModule,
  TracingModule,
} from '@novu/application-generic';
import * as packageJson from '../package.json';

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
  modules.push(RavenModule);
  providers.push({
    provide: APP_INTERCEPTOR,
    useValue: new RavenInterceptor(),
  });
}

@Module({
  imports: modules,
  exports: [],
  controllers: [AppController],
  providers,
})
export class AppModule {}
