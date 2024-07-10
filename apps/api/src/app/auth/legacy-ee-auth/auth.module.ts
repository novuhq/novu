import { MiddlewareConsumer, Module, NestModule, Provider, RequestMethod } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import passport from 'passport';
import { AuthProviderEnum } from '@novu/shared';
import {
  AnalyticsService,
  AuthService,
  cacheService,
  CreateUser,
  SwitchEnvironment,
  SwitchOrganization,
} from '@novu/application-generic';
import {
  EnvironmentRepository,
  MemberRepository,
  OrganizationRepository,
  SubscriberRepository,
  UserRepository,
} from '@novu/dal';

import { AuthController } from './auth.controller';
import { GoogleStrategy } from './google.strategy';

const AUTH_STRATEGIES: Provider[] = [];
if (process.env.GOOGLE_OAUTH_CLIENT_ID) {
  AUTH_STRATEGIES.push(GoogleStrategy);
}

const DAL = [SubscriberRepository, OrganizationRepository, EnvironmentRepository, UserRepository];
const SERVICES = [
  CreateUser,
  AnalyticsService,
  MemberRepository,
  SwitchOrganization,
  SwitchEnvironment,
  cacheService,
  AuthService,
];
const PROVIDERS = [...DAL, ...SERVICES];

const PASSPORT_MODULE = PassportModule.register({
  defaultStrategy: AuthProviderEnum.GOOGLE,
});

@Module({
  imports: [
    PASSPORT_MODULE,
    JwtModule.register({
      secretOrKeyProvider: () => process.env.JWT_SECRET as string,
      signOptions: {
        expiresIn: 360000,
      },
    }),
  ],
  providers: [...AUTH_STRATEGIES, ...PROVIDERS],
  controllers: [AuthController],
  exports: [],
})
export class LegacyEEAuthModule implements NestModule {
  public configure(consumer: MiddlewareConsumer) {
    if (process.env.GOOGLE_OAUTH_CLIENT_ID) {
      consumer
        .apply(
          passport.authenticate(AuthProviderEnum.GOOGLE, {
            session: false,
            scope: ['profile', 'email'],
          })
        )
        .forRoutes({
          path: '/auth/google',
          method: RequestMethod.GET,
        });
    }
  }
}
