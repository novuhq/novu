import { AuthService, IAuthService, PlatformException, UserAuthGuard } from '@novu/application-generic';
import { RolesGuard } from './framework/roles.guard';
import { RootEnvironmentGuard } from './framework/root-environment-guard.service';
import { ModuleMetadata } from '@nestjs/common';

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
  const eeAuthModuleConfig = eeAuthPackage?.eeAuthModuleConfig;

  if (!eeAuthModuleConfig) {
    throw new Error('eeAuthModuleConfig is not loaded');
  }

  return {
    ...eeAuthModuleConfig,
    imports: [...(eeAuthModuleConfig.imports || [])],
    controllers: [...(eeAuthModuleConfig.controllers || [])],
    providers: [
      ...(eeAuthModuleConfig.providers || []),
      eeAuthServiceProvider,
      eeUserRepositoryProvider,
      eeMemberRepositoryProvider,
      eeOrganizationRepositoryProvider,
      UserAuthGuard,
      RolesGuard,
      AuthService,
      RootEnvironmentGuard,
    ],
    exports: [
      ...(eeAuthModuleConfig.exports || []),
      RolesGuard,
      RootEnvironmentGuard,
      AuthService,
      UserAuthGuard,
      'AUTH_SERVICE',
      'USER_REPOSITORY',
      'MEMBER_REPOSITORY',
      'ORGANIZATION_REPOSITORY',
    ],
  };
}
