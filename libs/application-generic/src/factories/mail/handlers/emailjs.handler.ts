import { IEmailJsConfig, EmailJsProvider } from '@novu/providers';
import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  ICredentials,
} from '@novu/shared';
import { BaseHandler } from './base.handler';

/**
 * DEPRECATED:
 * This provider has been deprecated and will be removed in future version.
 * See: https://github.com/novuhq/novu/issues/2315
 */
export class EmailJsHandler extends BaseHandler {
  constructor() {
    super(EmailProviderIdEnum.EmailJS, ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from?: string) {
    const config: IEmailJsConfig = {
      from: from as string,
      host: credentials.host as string,
      port: Number(credentials.port),
      secure: credentials.secure as boolean,
      user: credentials.user as string,
      password: credentials.password as string,
    };

    this.provider = new EmailJsProvider(config);
  }
}
