import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import * as passport from 'passport';
import { RolesGuard } from './framework/roles.guard';
import { JwtStrategy } from './services/passport/jwt.strategy';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { AuthService } from './services/auth.service';
import { USE_CASES } from './usecases';
import { SharedModule } from '../shared/shared.module';
import { GithubStrategy } from './services/passport/github.strategy';
import { OrganizationModule } from '../organization/organization.module';
import { ApplicationsModule } from '../applications/applications.module';
import { JwtSubscriberStrategy } from './services/passport/subscriber-jwt.strategy';
import { JwtAuthGuard } from './framework/auth.guard';

const AUTH_STRATEGIES = [];

if (process.env.GITHUB_OAUTH_CLIENT_ID) {
  AUTH_STRATEGIES.push(GithubStrategy);
}

@Module({
  imports: [
    OrganizationModule,
    SharedModule,
    UserModule,
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    JwtModule.register({
      secretOrKeyProvider: () => process.env.JWT_SECRET as string,
      signOptions: {
        expiresIn: 360000,
      },
    }),
    ApplicationsModule,
  ],
  controllers: [AuthController],
  providers: [
    JwtAuthGuard,
    ...USE_CASES,
    ...AUTH_STRATEGIES,
    JwtStrategy,
    AuthService,
    RolesGuard,
    JwtSubscriberStrategy,
  ],
  exports: [RolesGuard, AuthService, ...USE_CASES, JwtAuthGuard],
})
export class AuthModule implements NestModule {
  public configure(consumer: MiddlewareConsumer) {
    if (process.env.GITHUB_OAUTH_CLIENT_ID) {
      consumer
        .apply(
          passport.authenticate('github', {
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
}
