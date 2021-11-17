import { DynamicModule, Global, Module } from '@nestjs/common';
import { NotifireOptions } from '../interfaces';
import { createNotifireProviders } from '../providers';

@Global()
@Module({})
export class NotifireModule {
  public static forRoot(options: NotifireOptions): DynamicModule {
    const providers = createNotifireProviders(options);

    return {
      module: NotifireModule,
      providers,
      exports: providers,
    };
  }
}
