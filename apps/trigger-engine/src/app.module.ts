import { Module, OnModuleInit } from '@nestjs/common';
import { RavenInterceptor, RavenModule } from 'nest-raven';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { HealthModule } from './health/health.module';
import { TriggerEngineModule } from './trigger-engine/trigger-engine.module';

const modules = [SharedModule, HealthModule, TriggerEngineModule];

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
  controllers: [],
  providers,
})
export class AppModule {}
