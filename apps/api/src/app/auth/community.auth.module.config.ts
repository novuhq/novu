import { MiddlewareConsumer, ModuleMetadata, Provider, RequestMethod } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import * as passport from 'passport';

import { AuthProviderEnum, PassportStrategyEnum } from '@novu/shared';
import {
  AnalyticsService,
  AuthService,
  CommunityAuthService,
  CreateUser,
  IAuthService,
  SwitchEnvironment,
  SwitchOrganization,
} from '@novu/application-generic';

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
import {
  UserRepository,
  SubscriberRepository,
  OrganizationRepository,
  EnvironmentRepository,
  MemberRepository,
} from '@novu/dal';

const AUTH_STRATEGIES: Provider[] = [JwtStrategy, ApiKeyStrategy, JwtSubscriberStrategy];

if (process.env.GITHUB_OAUTH_CLIENT_ID) {
  AUTH_STRATEGIES.push(GitHubStrategy);
}

const communityAuthServiceProvider = {
  provide: 'AUTH_SERVICE',
  useFactory: (
    userRepository: UserRepository,
    subscriberRepository: SubscriberRepository,
    createUserUsecase: CreateUser,
    jwtService: JwtService,
    analyticsService: AnalyticsService,
    organizationRepository: OrganizationRepository,
    environmentRepository: EnvironmentRepository,
    memberRepository: MemberRepository,
    switchOrganizationUsecase: SwitchOrganization,
    switchEnvironmentUsecase: SwitchEnvironment
  ): IAuthService => {
    return new CommunityAuthService(
      userRepository,
      subscriberRepository,
      createUserUsecase,
      jwtService,
      analyticsService,
      organizationRepository,
      environmentRepository,
      memberRepository,
      switchOrganizationUsecase,
      switchEnvironmentUsecase
    );
  },
  inject: [
    UserRepository,
    SubscriberRepository,
    CreateUser,
    JwtService,
    AnalyticsService,
    OrganizationRepository,
    EnvironmentRepository,
    MemberRepository,
    SwitchOrganization,
    SwitchEnvironment,
  ],
};

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
      EnvironmentsModule,
    ],
    controllers: [AuthController],
    providers: [
      UserAuthGuard,
      ...USE_CASES,
      ...AUTH_STRATEGIES,
      AuthService,
      RolesGuard,
      RootEnvironmentGuard,
      communityAuthServiceProvider,
    ],
    exports: [RolesGuard, RootEnvironmentGuard, AuthService, ...USE_CASES, UserAuthGuard],
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
