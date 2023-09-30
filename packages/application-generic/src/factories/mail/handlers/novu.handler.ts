import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import { SendgridEmailProvider } from '@novu/sendgrid';

import { BaseHandler } from './base.handler';

export class NovuEmailHandler extends BaseHandler {
  constructor() {
    super(EmailProviderIdEnum.Novu, ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials, from?: string) {
    this.provider = new SendgridEmailProvider({
      apiKey: credentials.apiKey,
      from,
      senderName: credentials.senderName,
      ipPoolName: credentials.ipPoolName,
    });
  }
}
