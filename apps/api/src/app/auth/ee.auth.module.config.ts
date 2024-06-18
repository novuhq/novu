import {
  AuthService,
  IAuthService,
  PlatformException,
  SwitchEnvironment,
  SwitchOrganization,
  injectRepositories,
} from '@novu/application-generic';
import { RolesGuard } from './framework/roles.guard';
import { RootEnvironmentGuard } from './framework/root-environment-guard.service';
import { ModuleMetadata, Provider } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  EnvironmentRepository,
  MemberRepository,
  OrganizationRepository,
  UserRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ApiKeyStrategy } from './services/passport/apikey.strategy';
import { JwtSubscriberStrategy } from './services/passport/subscriber-jwt.strategy';
import { JwtModule, JwtService } from '@nestjs/jwt';

const eeAuthServiceProvider = {
  provide: 'AUTH_SERVICE',
  useFactory: (
    userRepository: UserRepository,
    environmentRepository: EnvironmentRepository,
    subscriberRepository: SubscriberRepository,
    jwtService: JwtService
  ): IAuthService => {
    const eeAuthPackage = require('@novu/ee-auth');
    if (!eeAuthPackage?.EEAuthService) {
      throw new PlatformException('EEAuthService is not loaded');
    }

    return new eeAuthPackage.EEAuthService(userRepository, environmentRepository, subscriberRepository, jwtService);
  },
  inject: [UserRepository, EnvironmentRepository, SubscriberRepository, JwtService],
};

const eeUserAuthGuard = {
  provide: 'USER_AUTH_GUARD',
  useFactory: (reflector: Reflector) => {
    const eeAuthPackage = require('@novu/ee-auth');
    if (!eeAuthPackage?.EEUserAuthGuard) {
      throw new PlatformException('EEUserAuthGuard is not loaded');
    }

    return new eeAuthPackage.EEUserAuthGuard(reflector);
  },
  inject: [Reflector],
};

export function getEEModuleConfig(): ModuleMetadata {
  const eeAuthPackage = require('@novu/ee-auth');
  const clerkStrategy = eeAuthPackage?.ClerkStrategy;

  const AUTH_STRATEGIES: Provider[] = [clerkStrategy, ApiKeyStrategy, JwtSubscriberStrategy];
  const EE_AUTH_PROVIDERS: Provider[] = [eeAuthServiceProvider, AuthService, eeUserAuthGuard];

  return {
    imports: [
      JwtModule.register({
        secret: `${process.env.JWT_SECRET}`,
        signOptions: {
          expiresIn: 360000,
        },
      }),
    ],
    providers: [
      ...AUTH_STRATEGIES,
      ...EE_AUTH_PROVIDERS,
      ...injectRepositories(),
      // original repositories need to be here for the DI to work
      UserRepository,
      MemberRepository,
      OrganizationRepository,
      EnvironmentRepository,
      SubscriberRepository,
      // reused services
      SwitchEnvironment,
      SwitchOrganization,
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
    ],
  };
}
