import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import {
  createNestLoggingModuleOptions,
  GracefulShutdownConfigModule,
  LoggerModule,
  ProfilingModule,
  TracingModule,
} from '@novu/application-generic';
import { SentryModule } from '@sentry/nestjs/setup';
import { join } from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { SharedModule } from './shared/shared.module';
import { SocketModule } from './socket/socket.module';

import packageJson from '../package.json';

const modules = [
  SharedModule,
  HealthModule,
  TracingModule.register(packageJson.name, packageJson.version),
  ProfilingModule.register(packageJson.name),
  SocketModule,
  LoggerModule.forRoot(
    createNestLoggingModuleOptions({
      serviceName: packageJson.name,
      version: packageJson.version,
    })
  ),
  GracefulShutdownConfigModule.forRootAsync(),
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const providers: any[] = [AppService];

if (process.env.SENTRY_DSN) {
  modules.unshift(SentryModule.forRoot());
}
if (!!process.env.SOCKET_IO_ADMIN_USERNAME && !!process.env.SOCKET_IO_ADMIN_PASSWORD_HASH) {
  modules.push(
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../node_modules/@socket.io/admin-ui/ui/dist'),
      serveRoot: '/admin',
      exclude: ['/api/(.*)'],
    })
  );
}

@Module({
  imports: modules,
  exports: [SocketModule],
  controllers: [AppController],
  providers,
})
export class AppModule {}
