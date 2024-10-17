import { MiddlewareConsumer, ModuleMetadata, Provider, RequestMethod } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import passport from 'passport';

import { AuthProviderEnum, PassportStrategyEnum } from '@novu/shared';
import { AuthService, RolesGuard, injectCommunityAuthProviders } from '@novu/application-generic';

import { JwtStrategy } from './services/passport/jwt.strategy';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { USE_CASES } from './usecases';
import { SharedModule } from '../shared/shared.module';
import { GitHubStrategy } from './services/passport/github.strategy';
import { OrganizationModule } from '../organization/organization.module';
import { EnvironmentsModuleV1 } from '../environments-v1/environments-v1.module';
import { JwtSubscriberStrategy } from './services/passport/subscriber-jwt.strategy';
import { RootEnvironmentGuard } from './framework/root-environment-guard.service';
import { ApiKeyStrategy } from './services/passport/apikey.strategy';

const AUTH_STRATEGIES: Provider[] = [JwtStrategy, ApiKeyStrategy, JwtSubscriberStrategy];

if (process.env.GITHUB_OAUTH_CLIENT_ID) {
  AUTH_STRATEGIES.push(GitHubStrategy);
}

export function getCommunityAuthModuleConfig(): ModuleMetadata {
  return {
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
      EnvironmentsModuleV1,
    ],
    controllers: [AuthController],
    providers: [
      ...USE_CASES,
      ...AUTH_STRATEGIES,
      ...injectCommunityAuthProviders({ repositoriesOnly: false }),
      AuthService,
      RolesGuard,
      RootEnvironmentGuard,
    ],
    exports: [
      RolesGuard,
      RootEnvironmentGuard,
      AuthService,
      'AUTH_SERVICE',
      'USER_AUTH_GUARD',
      'USER_REPOSITORY',
      'MEMBER_REPOSITORY',
      'ORGANIZATION_REPOSITORY',
      ...USE_CASES,
    ],
  };
}

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
