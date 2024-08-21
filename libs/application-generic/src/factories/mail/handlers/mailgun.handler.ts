import { MailgunEmailProvider } from '@novu/providers';
import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  ICredentials,
} from '@novu/shared';
import { BaseHandler } from './base.handler';

export class MailgunHandler extends BaseHandler {
  constructor() {
    super(EmailProviderIdEnum.Mailgun, ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials, from?: string) {
    const config: {
      apiKey: string;
      username: string;
      domain: string;
      from: string;
      baseUrl?: string;
      senderName: string;
    } = {
      apiKey: credentials.apiKey,
      username: credentials.user,
      domain: credentials.domain,
      baseUrl: credentials.baseUrl,
      senderName: credentials.senderName,
      from: from as string,
    };

    this.provider = new MailgunEmailProvider(config);
  }
}
