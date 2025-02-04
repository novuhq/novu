/* eslint-disable global-require */
import { PlatformException, cacheService } from '@novu/application-generic';
import { MiddlewareConsumer, ModuleMetadata } from '@nestjs/common';
import { RootEnvironmentGuard } from './framework/root-environment-guard.service';
import { ApiKeyStrategy } from './services/passport/apikey.strategy';
import { JwtSubscriberStrategy } from './services/passport/subscriber-jwt.strategy';
import { OrganizationModule } from '../organization/organization.module';
import { AuthService } from './services/auth.service';
import { RolesGuard } from './framework/roles.guard';

function getEEAuthProviders() {
  const eeAuthPackage = require('@novu/ee-auth');

  return eeAuthPackage.injectEEAuthProviders();
}

export function getEEModuleConfig(): ModuleMetadata {
  const eeAuthPackage = require('@novu/ee-auth');
  const eeAuthModule = eeAuthPackage?.eEAuthModule;

  if (!eeAuthModule) {
    throw new PlatformException('ee-auth module is not loaded');
  }

  return {
    imports: [...eeAuthModule.imports, OrganizationModule],
    controllers: [...eeAuthModule.controllers],
    providers: [
      ...eeAuthModule.providers,
      ...getEEAuthProviders(),
      // reused services
      ApiKeyStrategy,
      JwtSubscriberStrategy,
      AuthService,
      cacheService,
      RolesGuard,
      RootEnvironmentGuard,
    ],
    exports: [
      ...eeAuthModule.exports,
      RolesGuard,
      RootEnvironmentGuard,
      AuthService,
      'USER_REPOSITORY',
      'MEMBER_REPOSITORY',
      'ORGANIZATION_REPOSITORY',
    ],
  };
}

export function configure(consumer: MiddlewareConsumer) {
  const eeAuthPackage = require('@novu/ee-auth');

  if (!eeAuthPackage?.configure) {
    throw new PlatformException('ee-auth configure() is not loaded');
  }

  eeAuthPackage.configure(consumer);
}
