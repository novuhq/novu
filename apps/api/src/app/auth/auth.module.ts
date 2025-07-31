import { Global, MiddlewareConsumer, Module, ModuleMetadata } from '@nestjs/common';
import { isClerkEnabled } from '@novu/shared';
import { configure as configureCommunity, getCommunityAuthModuleConfig } from './community.auth.module.config';
import { configure as configureEE, getEEModuleConfig } from './ee.auth.module.config';

function getModuleConfig(): ModuleMetadata {
  if (isClerkEnabled()) {
    return getEEModuleConfig();
  } else {
    return getCommunityAuthModuleConfig();
  }
}

@Global()
@Module(getModuleConfig())
export class AuthModule {
  public configure(consumer: MiddlewareConsumer) {
    if (isClerkEnabled()) {
      configureEE(consumer);
    } else {
      configureCommunity(consumer);
    }
  }
}
