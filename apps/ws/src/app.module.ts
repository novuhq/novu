import { DynamicModule, ForwardReference, Module, OnModuleInit, Type } from '@nestjs/common';
import { RavenInterceptor, RavenModule } from 'nest-raven';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { HealthModule } from './health/health.module';
import { SocketModule } from './socket/socket.module';
import { getOTELModule } from '@novu/application-generic';

const modules: Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> = [
  SharedModule,
  HealthModule,
  SocketModule,
  getOTELModule(),
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
  exports: [SocketModule],
  controllers: [AppController],
  providers,
})
export class AppModule {}
