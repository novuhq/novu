import { MailjetEmailProvider } from '@novu/providers';
import { ChannelTypeEnum, EmailProviderIdEnum, ICredentials } from '@novu/shared';
import { BaseEmailHandler } from './base.handler';

export class MailjetHandler extends BaseEmailHandler {
  constructor() {
    super(EmailProviderIdEnum.Mailjet, ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from?: string) {
    const config: {
      apiKey: string;
      apiSecret: string;
      from: string;
      senderName: string;
    } = {
      from: from as string,
      apiKey: credentials.apiKey as string,
      apiSecret: credentials.secretKey as string,
      senderName: credentials.senderName as string,
    };

    this.provider = new MailjetEmailProvider(config);
  }
}
