import { ModuleMetadata, Type } from '@nestjs/common';
import {
  IChatProvider,
  IEmailProvider,
  IPushProvider,
  ISmsProvider,
  ITemplate,
} from '@novu/stateless';

export interface INovuOptions {
  /*
   *
   * This interface describes the options you want to pass to
   * NovuModule.
   *
   */
  providers: (IEmailProvider | ISmsProvider | IChatProvider | IPushProvider)[];

  templates: ITemplate[];
}

export interface INovuOptionsFactory {
  createNovuOptions(): Promise<INovuOptions> | INovuOptions;
}

export interface INovuModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<INovuOptionsFactory>;
  useClass?: Type<INovuOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<INovuOptions> | INovuOptions;
  inject?: any[];
}
