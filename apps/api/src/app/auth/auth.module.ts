import { Global, MiddlewareConsumer, Module, ModuleMetadata } from '@nestjs/common';
import { getCommunityAuthModuleConfig, configure as configureCommunity } from './community.auth.module.config';
import { getEEModuleConfig, configure as configureEE } from './ee.auth.module.config';

function getModuleConfig(): ModuleMetadata {
  if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
    return getEEModuleConfig();
  } else {
    return getCommunityAuthModuleConfig();
  }
}

@Global()
@Module(getModuleConfig())
export class AuthModule {
  public configure(consumer: MiddlewareConsumer) {
    if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
      configureEE(consumer);
    } else {
      configureCommunity(consumer);
    }
  }
}
