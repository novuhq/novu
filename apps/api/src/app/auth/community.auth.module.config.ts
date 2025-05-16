import { MiddlewareConsumer, ModuleMetadata, Provider, RequestMethod } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import passport from 'passport';
import { AuthProviderEnum, PassportStrategyEnum } from '@novu/shared';
import { CommunityUserRepository, CommunityOrganizationRepository, CommunityMemberRepository } from '@novu/dal';
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
import { AuthService } from './services/auth.service';
import { RolesGuard } from './framework/roles.guard';
import { CommunityAuthService } from './services/community.auth.service';
import { CommunityUserAuthGuard } from './framework/community.user.auth.guard';

const AUTH_STRATEGIES: Provider[] = [JwtStrategy, ApiKeyStrategy, JwtSubscriberStrategy];

if (process.env.GITHUB_OAUTH_CLIENT_ID) {
  AUTH_STRATEGIES.push(GitHubStrategy);
}

export function getCommunityAuthModuleConfig(): ModuleMetadata {
  const baseImports = [
    PassportModule.register({
      defaultStrategy: PassportStrategyEnum.JWT,
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: 360000,
      },
    }),
  ];

  const baseProviders = [...AUTH_STRATEGIES, AuthService, RolesGuard, RootEnvironmentGuard];

  // Wherever is the string token used, override it with the provider
  const injectableProviders = [
    {
      provide: 'USER_REPOSITORY',
      useClass: CommunityUserRepository,
    },
    {
      provide: 'ORGANIZATION_REPOSITORY',
      useClass: CommunityOrganizationRepository,
    },
    {
      provide: 'MEMBER_REPOSITORY',
      useClass: CommunityMemberRepository,
    },
    {
      provide: 'AUTH_SERVICE',
      useClass: CommunityAuthService,
    },
    {
      provide: 'USER_AUTH_GUARD',
      useClass: CommunityUserAuthGuard,
    },
  ];

  return {
    imports: [...baseImports, EnvironmentsModuleV1, SharedModule, UserModule, OrganizationModule],
    controllers: [AuthController],
    providers: [...baseProviders, ...injectableProviders, ...USE_CASES],
    exports: [
      RolesGuard,
      RootEnvironmentGuard,
      AuthService,
      'AUTH_SERVICE',
      'USER_AUTH_GUARD',
      'USER_REPOSITORY',
      'MEMBER_REPOSITORY',
      'ORGANIZATION_REPOSITORY',
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
