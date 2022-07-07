import {
  IDirectProvider,
  IEmailProvider,
  IPushProvider,
  ISmsProvider,
  ITemplate,
} from '@novu/stateless';

export interface NovuOptions {
  //
  // This interface describes the options you want to pass to
  // NovuModule.
  //
  providers: (IEmailProvider | ISmsProvider | IDirectProvider | IPushProvider)[];
  templates: ITemplate[];
}
