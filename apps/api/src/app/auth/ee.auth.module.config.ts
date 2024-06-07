import {
  AuthService,
  IAuthService,
  PlatformException,
  SwitchEnvironment,
  SwitchOrganization,
} from '@novu/application-generic';
import { RolesGuard } from './framework/roles.guard';
import { RootEnvironmentGuard } from './framework/root-environment-guard.service';
import { ModuleMetadata } from '@nestjs/common';
import { EnvironmentRepository, MemberRepository, OrganizationRepository, UserRepository } from '@novu/dal';

const eeAuthServiceProvider = {
  provide: 'AUTH_SERVICE',
  useFactory: (): IAuthService => {
    const eeAuthPackage = require('@novu/ee-auth');
    if (!eeAuthPackage?.EEAuthService) {
      throw new PlatformException('EEAuthService is not loaded');
    }

    return new eeAuthPackage.EEAuthService();
  },
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

export function getEEModuleConfig(): ModuleMetadata {
  const eeAuthPackage = require('@novu/ee-auth');
  const jwtClerkStrategy = eeAuthPackage?.JwtClerkStrategy;
  const eeAuthController = eeAuthPackage?.EEAuthController;

  if (!jwtClerkStrategy) {
    throw new Error('jwtClerkStrategy is not loaded');
  }

  if (!eeAuthController) {
    throw new Error('EEAuthController is not loaded');
  }

  return {
    imports: [],
    controllers: [eeAuthController],
    providers: [
      jwtClerkStrategy,
      eeAuthServiceProvider,
      eeUserRepositoryProvider,
      eeMemberRepositoryProvider,
      eeOrganizationRepositoryProvider,
      eeUserAuthGuard,
      UserRepository,
      MemberRepository,
      EnvironmentRepository,
      OrganizationRepository,
      SwitchEnvironment,
      SwitchOrganization,
      RolesGuard,
      AuthService,
      RootEnvironmentGuard,
    ],
    exports: [
      jwtClerkStrategy,
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
