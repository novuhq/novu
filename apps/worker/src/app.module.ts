import { DynamicModule, ForwardReference, Logger, Module, Provider, Type } from '@nestjs/common';

import { ProfilingModule } from '@novu/application-generic';
import { APP_FILTER } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { SharedModule } from './app/shared/shared.module';
import { HealthModule } from './app/health/health.module';
import { WorkflowModule } from './app/workflow/workflow.module';
import { TelemetryModule } from './app/telemetry/telemetry.module';
import packageJson from '../package.json';

const modules: Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> = [
  SharedModule,
  HealthModule,
  WorkflowModule,
  TelemetryModule,
  ProfilingModule.register(packageJson.name),
];

const providers: Provider[] = [];

if (process.env.SENTRY_DSN) {
  modules.unshift(SentryModule.forRoot());
  providers.unshift({
    provide: APP_FILTER,
    useClass: SentryGlobalFilter,
  });
}

@Module({
  imports: modules,
  controllers: [],
  providers,
})
export class AppModule {
  constructor() {
    Logger.log(`BOOTSTRAPPED NEST APPLICATION`);
  }
}
