import { MiddlewareConsumer, ModuleMetadata } from '@nestjs/common';
import {
  cacheService,
  FeatureFlagsService,
  featureFlagsService,
  InMemoryLRUCacheService,
  PlatformException,
} from '@novu/application-generic';
import { RootEnvironmentGuard } from './framework/root-environment-guard.service';
import { AuthService } from './services/auth.service';
import { ApiKeyV2EnvironmentGuard } from './guards/api-key-v2-environment.guard';
import { ApiKeyV2AuthService } from './services/api-key-v2-auth.service';
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
      ApiKeyV2AuthService,
      ApiKeyV2EnvironmentGuard,
      JwtSubscriberStrategy,
      AuthService,
      cacheService,
      featureFlagsService,
      InMemoryLRUCacheService,
      RootEnvironmentGuard,
    ],
    exports: [
      ...eeAuthModule.exports,
      RootEnvironmentGuard,
      ApiKeyV2AuthService,
      ApiKeyV2EnvironmentGuard,
      AuthService,
      FeatureFlagsService,
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
