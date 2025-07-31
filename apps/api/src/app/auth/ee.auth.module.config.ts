import { MiddlewareConsumer, ModuleMetadata } from '@nestjs/common';
import { cacheService, PlatformException } from '@novu/application-generic';
import { RootEnvironmentGuard } from './framework/root-environment-guard.service';
import { AuthService } from './services/auth.service';
import { ApiKeyStrategy } from './services/passport/apikey.strategy';
import { JwtSubscriberStrategy } from './services/passport/subscriber-jwt.strategy';

export function getEEModuleConfig(): ModuleMetadata {
  const eeAuthPackage = require('@novu/ee-auth');
  const eeAuthModule = eeAuthPackage?.eeAuthModule;

  if (!eeAuthModule) {
    throw new PlatformException('ee-auth module is not loaded');
  }

  return {
    imports: [...eeAuthModule.imports],
    controllers: [...eeAuthModule.controllers],
    providers: [
      ...eeAuthModule.providers,
      // reused services
      ApiKeyStrategy,
      JwtSubscriberStrategy,
      AuthService,
      cacheService,
      RootEnvironmentGuard,
    ],
    exports: [...eeAuthModule.exports, RootEnvironmentGuard, AuthService],
  };
}

export function configure(consumer: MiddlewareConsumer) {
  const eeAuthPackage = require('@novu/ee-auth');

  if (!eeAuthPackage?.configure) {
    throw new PlatformException('ee-auth configure() is not loaded');
  }

  eeAuthPackage.configure(consumer);
}
