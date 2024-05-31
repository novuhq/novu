import { MiddlewareConsumer, Module } from '@nestjs/common';
import { authModuleConfig, configure } from './auth.module.config';

function getModuleConfig() {
  if (process.env.NOVU_ENTERPRISE === 'true') {
    const eeAuthPackage = require('@novu/ee-auth');
    if (!eeAuthPackage?.eeAuthModuleConfig) {
      throw new Error('eeAuthModuleConfig is not loaded');
    }

    return eeAuthPackage.eeAuthModuleConfig;
  } else {
    return authModuleConfig;
  }
}

@Module(getModuleConfig())
export class AuthModule {
  public configure(consumer: MiddlewareConsumer) {
    if (process.env.NOVU_ENTERPRISE !== 'true') {
      configure(consumer);
    }
  }
}
