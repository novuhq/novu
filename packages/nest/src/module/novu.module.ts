import { DynamicModule, Global, Module } from '@nestjs/common';
import { INovuModuleAsyncOptions, INovuOptions } from '../interfaces';
import { createAsyncNovuProviders, createNovuProviders } from '../providers';

@Global()
@Module({})
export class NovuModule {
  public static forRoot(options: INovuOptions): DynamicModule {
    const providers = createNovuProviders(options);

    return {
      module: NovuModule,
      providers,
      exports: providers,
    };
  }

  public static forRootAsync(options: INovuModuleAsyncOptions): DynamicModule {
    const providers = createAsyncNovuProviders(options);

    return {
      module: NovuModule,
      providers: [],
      exports: providers,
      imports: options.imports || [],
    };
  }
}
