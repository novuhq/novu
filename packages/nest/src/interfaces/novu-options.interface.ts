import {
  IDirectProvider,
  IEmailProvider,
  ISmsProvider,
  ITemplate,
} from '@novu/node';

export interface NovuOptions {
  //
  // This interface describes the options you want to pass to
  // NovuModule.
  //
  providers: (IEmailProvider | ISmsProvider | IDirectProvider)[];
  templates: ITemplate[];
}
