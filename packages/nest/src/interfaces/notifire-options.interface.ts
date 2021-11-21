import {
  IDirectProvider,
  IEmailProvider,
  ISmsProvider,
  ITemplate,
} from '@notifire/core';

export interface NotifireOptions {
  //
  // This interface describes the options you want to pass to
  // NotifireModule.
  //
  providers: (IEmailProvider | ISmsProvider | IDirectProvider)[];
  templates: ITemplate[];
}
