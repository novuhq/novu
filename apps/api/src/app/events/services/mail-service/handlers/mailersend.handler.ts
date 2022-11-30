import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { MailersendEmailProvider } from '@novu/mailersend';

import { BaseHandler } from './base.handler';

export class MailerSendHandler extends BaseHandler {
  constructor() {
    super('mailersend', ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials, from?: string) {
    this.provider = new MailersendEmailProvider({
      apiKey: credentials.apiKey,
      from,
      senderName: credentials.senderName,
    });
  }
}
