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
    ],
  };
}
