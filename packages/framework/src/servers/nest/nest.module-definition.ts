import { ConfigurableModuleBuilder } from '@nestjs/common';
import { NovuModuleOptions } from './nest.interface';

// use ConfigurableModuleBuilder, because building dynamic modules from scratch is painful
export const {
  ConfigurableModuleClass: NovuBaseModule,
  MODULE_OPTIONS_TOKEN: NOVU_OPTIONS,
  OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<NovuModuleOptions>()
  .setClassMethodName('register')
  .setFactoryMethodName('createNovuModuleOptions')
  .setExtras((definition: NovuModuleOptions) => ({
    ...definition,
    isGlobal: true,
  }))
  .build();
