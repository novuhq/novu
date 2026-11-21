import { MailKiteEmailProvider } from '@novu/providers';
import { ChannelTypeEnum, EmailProviderIdEnum, ICredentials } from '@novu/shared';
import { BaseEmailHandler } from './base.handler';

export class MailKiteHandler extends BaseEmailHandler {
  constructor() {
    super(EmailProviderIdEnum.Mailkite, ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new MailKiteEmailProvider({
      apiKey: credentials.apiKey,
      from: credentials.from,
      senderName: credentials.senderName,
    });
  }
}
