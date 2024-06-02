import { Global, MiddlewareConsumer, Module, ModuleMetadata } from '@nestjs/common';
import { getCommunityAuthModuleConfig, configure } from './community.auth.module.config';
import { getEEModuleConfig } from './ee.auth.module.config';

function getModuleConfig(): ModuleMetadata {
  if (process.env.NOVU_ENTERPRISE === 'true') {
    return getEEModuleConfig();
  } else {
    return getCommunityAuthModuleConfig();
  }
}

@Global()
@Module(getModuleConfig())
export class AuthModule {
  public configure(consumer: MiddlewareConsumer) {
    if (process.env.NOVU_ENTERPRISE !== 'true') {
      configure(consumer);
    }
  }
}
