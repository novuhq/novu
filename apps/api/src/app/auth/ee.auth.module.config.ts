import {
  AuthService,
  IAuthService,
  PlatformException,
  SwitchEnvironment,
  SwitchOrganization,
} from '@novu/application-generic';
import { RolesGuard } from './framework/roles.guard';
import { RootEnvironmentGuard } from './framework/root-environment-guard.service';
import { ModuleMetadata, Provider } from '@nestjs/common';
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
    memberRepository: MemberRepository,
    environmentRepository: EnvironmentRepository,
    subscriberRepository: SubscriberRepository,
    jwtService: JwtService
  ): IAuthService => {
    const eeAuthPackage = require('@novu/ee-auth');
    if (!eeAuthPackage?.EEAuthService) {
      throw new PlatformException('EEAuthService is not loaded');
    }

    return new eeAuthPackage.EEAuthService(
      userRepository,
      memberRepository,
      environmentRepository,
      subscriberRepository,
      jwtService
    );
  },
  inject: [UserRepository, MemberRepository, EnvironmentRepository, SubscriberRepository, JwtService],
};

const eeUserAuthGuard = {
  provide: 'USER_AUTH_GUARD',
  useFactory: () => {
    const eeAuthPackage = require('@novu/ee-auth');
    if (!eeAuthPackage?.EEUserAuthGuard) {
      throw new PlatformException('EEUserAuthGuard is not loaded');
    }

    return new eeAuthPackage.EEUserAuthGuard();
  },
};

const eeUserRepositoryProvider = {
  provide: 'USER_REPOSITORY',
  useFactory: () => {
    const eeAuthPackage = require('@novu/ee-auth');
    if (!eeAuthPackage?.EEUserRepository) {
      throw new PlatformException('EEUserRepository is not loaded');
    }

    return new eeAuthPackage.EEUserRepository();
  },
};

const eeMemberRepositoryProvider = {
  provide: 'MEMBER_REPOSITORY',
  useFactory: () => {
    const eeAuthPackage = require('@novu/ee-auth');
    if (!eeAuthPackage?.EEMemberRepository) {
      throw new PlatformException('EEMemberRepository is not loaded');
    }

    return new eeAuthPackage.EEMemberRepository();
  },
};

const eeOrganizationRepositoryProvider = {
  provide: 'ORGANIZATION_REPOSITORY',
  useFactory: () => {
    const eeAuthPackage = require('@novu/ee-auth');
    if (!eeAuthPackage?.EEOrganizationRepository) {
      throw new PlatformException('EEOrganizationRepository is not loaded');
    }

    return new eeAuthPackage.EEOrganizationRepository();
  },
};

export const EE_REPOSITORIES = [eeUserRepositoryProvider, eeMemberRepositoryProvider, eeOrganizationRepositoryProvider];

export function getEEModuleConfig(): ModuleMetadata {
  const eeAuthPackage = require('@novu/ee-auth');
  const jwtClerkStrategy = eeAuthPackage?.JwtClerkStrategy;

  if (!jwtClerkStrategy) {
    throw new Error('jwtClerkStrategy is not loaded');
  }

  const AUTH_STRATEGIES: Provider[] = [jwtClerkStrategy, ApiKeyStrategy, JwtSubscriberStrategy];
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
      ...EE_REPOSITORIES,
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
