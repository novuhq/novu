import { DynamicModule, Global, Module } from '@nestjs/common';
import { NotifireService } from '../services';
import { NotifireOptions } from '../interfaces';
import { createNotifireProviders, instanceFactory } from '../providers';

@Global()
@Module({
  providers: [NotifireService, instanceFactory],
  exports: [NotifireService, instanceFactory],
})
export class NotifireModule {
  public static forRoot(options: NotifireOptions): DynamicModule {
    const _providers = createNotifireProviders(options);
    return {
      module: NotifireModule,
      providers: _providers,
      exports: _providers,
    };
  }
}
