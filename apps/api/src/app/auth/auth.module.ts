import { Global, MiddlewareConsumer, Module, ModuleMetadata } from '@nestjs/common';
import { IS_CLERK_ENABLED } from '@novu/shared';
import { getCommunityAuthModuleConfig, configure as configureCommunity } from './community.auth.module.config';
import { getEEModuleConfig, configure as configureEE } from './ee.auth.module.config';

function getModuleConfig(): ModuleMetadata {
  if (IS_CLERK_ENABLED) {
    return getEEModuleConfig();
  } else {
    return getCommunityAuthModuleConfig();
  }
}

@Global()
@Module(getModuleConfig())
export class AuthModule {
  public configure(consumer: MiddlewareConsumer) {
    if (IS_CLERK_ENABLED) {
      configureEE(consumer);
    } else {
      configureCommunity(consumer);
    }
  }
}
