import { Module, OnModuleInit } from '@nestjs/common';
import { RavenInterceptor, RavenModule } from 'nest-raven';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { HealthModule } from './health/health.module';
import { SocketModule } from './socket/socket.module';
import { createNestLoggingModuleOptions } from '@novu/application-generic';
import { LoggerModule } from 'nestjs-pino';
const packageJson = require('../package.json');

const modules = [SharedModule, HealthModule, SocketModule];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const providers: any[] = [
  AppService,
  LoggerModule.forRoot(
    createNestLoggingModuleOptions({
      serviceName: packageJson.name,
      version: packageJson.version,
    })
  ),
];

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
