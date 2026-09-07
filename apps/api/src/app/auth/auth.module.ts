import { Global, MiddlewareConsumer, Module, ModuleMetadata } from '@nestjs/common';
import { isBetterAuthEnabled, isClerkEnabled } from '@novu/shared';
import { configure as configureCommunity, getCommunityAuthModuleConfig } from './community.auth.module.config';
import { configure as configureEE, getEEModuleConfig } from './ee.auth.module.config';

function getModuleConfig(): ModuleMetadata {
  if (isClerkEnabled() || isBetterAuthEnabled()) {
    return getEEModuleConfig();
  } else {
    return getCommunityAuthModuleConfig();
  }
}

@Global()
@Module(getModuleConfig())
export class AuthModule {
  public configure(consumer: MiddlewareConsumer) {
    if (isClerkEnabled() || isBetterAuthEnabled()) {
      configureEE(consumer);
    } else {
      configureCommunity(consumer);
    }
  }
}
