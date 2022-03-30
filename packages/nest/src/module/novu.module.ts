import { DynamicModule, Global, Module } from '@nestjs/common';
import { NovuOptions } from '../interfaces';
import { createNovuProviders } from '../providers';

@Global()
@Module({})
export class NovuModule {
  public static forRoot(options: NovuOptions): DynamicModule {
    const providers = createNovuProviders(options);

    return {
      module: NovuModule,
      providers,
      exports: providers,
    };
  }
}
