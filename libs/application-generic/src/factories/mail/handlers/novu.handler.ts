import { SendgridEmailProvider } from '@novu/providers';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';

import { BaseEmailHandler } from './base.handler';

export class NovuEmailHandler extends BaseEmailHandler {
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
