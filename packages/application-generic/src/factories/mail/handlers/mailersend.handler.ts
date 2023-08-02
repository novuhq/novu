import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { MailersendEmailProvider } from '@novu/mailersend';

import { BaseHandler } from './base.handler';

export class MailerSendHandler extends BaseHandler {
  constructor() {
    super('mailersend', ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials, from?: string) {
    this.provider = new MailersendEmailProvider({
      apiKey: credentials.apiKey as string,
      from: from as string,
      senderName: credentials.senderName,
    });
  }
}
