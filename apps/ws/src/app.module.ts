import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { createNestLoggingModuleOptions, LoggerModule, TracingModule } from '@novu/application-generic';
import { SentryModule } from '@sentry/nestjs/setup';
import { join } from 'path';
import packageJson from '../package.json';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { SharedModule } from './shared/shared.module';
import { SocketModule } from './socket/socket.module';

const modules = [
  SharedModule,
  HealthModule,
  TracingModule.register(packageJson.name, packageJson.version),
  SocketModule,
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
