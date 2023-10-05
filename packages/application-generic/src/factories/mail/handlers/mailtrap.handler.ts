import {
  ChannelTypeEnum,
  ICredentials,
  EmailProviderIdEnum,
} from '@novu/shared';
import { MailtrapEmailProvider } from '@novu/mailtrap';
import { BaseHandler } from './base.handler';

export class MailtrapHandler extends BaseHandler {
  constructor() {
    super(EmailProviderIdEnum.Mailtrap, ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials, from: string) {
    const config: { apiKey: string; from: string } = {
      from: from as string,
      apiKey: credentials.apiKey as string,
    };

    this.provider = new MailtrapEmailProvider(config);
  }
}
