import { MiddlewareConsumer, ModuleMetadata, Provider, RequestMethod } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import * as passport from 'passport';

import { AuthProviderEnum, PassportStrategyEnum } from '@novu/shared';
import { AuthService } from '@novu/application-generic';

import { RolesGuard } from './framework/roles.guard';
import { JwtStrategy } from './services/passport/jwt.strategy';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { USE_CASES } from './usecases';
import { SharedModule } from '../shared/shared.module';
import { GitHubStrategy } from './services/passport/github.strategy';
import { OrganizationModule } from '../organization/organization.module';
import { EnvironmentsModule } from '../environments/environments.module';
import { JwtSubscriberStrategy } from './services/passport/subscriber-jwt.strategy';
import { UserAuthGuard } from './framework/user.auth.guard';
import { RootEnvironmentGuard } from './framework/root-environment-guard.service';
import { ApiKeyStrategy } from './services/passport/apikey.strategy';

const AUTH_STRATEGIES: Provider[] = [JwtStrategy, ApiKeyStrategy, JwtSubscriberStrategy];

if (process.env.GITHUB_OAUTH_CLIENT_ID) {
  AUTH_STRATEGIES.push(GitHubStrategy);
}

const authModuleConfig: ModuleMetadata = {
  imports: [
    OrganizationModule,
    SharedModule,
    UserModule,
    PassportModule.register({
      defaultStrategy: PassportStrategyEnum.JWT,
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: 360000,
      },
    }),
    EnvironmentsModule,
  ],
  controllers: [AuthController],
  providers: [UserAuthGuard, ...USE_CASES, ...AUTH_STRATEGIES, AuthService, RolesGuard, RootEnvironmentGuard],
  exports: [RolesGuard, RootEnvironmentGuard, AuthService, ...USE_CASES, UserAuthGuard],
};

export function configure(consumer: MiddlewareConsumer) {
  if (process.env.GITHUB_OAUTH_CLIENT_ID) {
    consumer
      .apply(
        passport.authenticate(AuthProviderEnum.GITHUB, {
          session: false,
          scope: ['user:email'],
        })
      )
      .forRoutes({
        path: '/auth/github',
        method: RequestMethod.GET,
      });
  }
}

export { authModuleConfig };
