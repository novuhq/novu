import {
  DynamicModule,
  ForwardReference,
  Logger,
  Module,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  OnModuleDestroy,
  Provider,
  Type,
} from '@nestjs/common';

import { APP_FILTER } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { HealthModule } from './app/health/health.module';
import { SharedModule } from './app/shared/shared.module';
import { TelemetryModule } from './app/telemetry/telemetry.module';
import { WorkflowModule } from './app/workflow/workflow.module';

const modules: Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> = [
  SharedModule,
  HealthModule,
  WorkflowModule,
  TelemetryModule,
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
export class AppModule implements OnApplicationBootstrap, OnApplicationShutdown, OnModuleDestroy {
  onModuleDestroy() {
    Logger.log(`[@novu/worker]: AppModule is shuttind down...`);
    Logger.flush();
  }

  onApplicationBootstrap() {
    Logger.log(`[@novu/worker]: Bootstrapped successfully!`);
  }

  onApplicationShutdown(signal: string) {
    Logger.log(`[@novu/worker]: Application shutdown with signal ${signal}`);
    Logger.flush();
  }
}
