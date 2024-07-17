import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  ICredentials,
} from '@novu/shared';
import { MailersendEmailProvider } from '@novu/providers';

import { BaseHandler } from './base.handler';

export class MailerSendHandler extends BaseHandler {
  constructor() {
    super(EmailProviderIdEnum.MailerSend, ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials, from?: string) {
    this.provider = new MailersendEmailProvider({
      apiKey: credentials.apiKey as string,
      from: from as string,
      senderName: credentials.senderName,
    });
  }
}
