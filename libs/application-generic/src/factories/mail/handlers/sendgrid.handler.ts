import { SendgridEmailProvider } from '@novu/providers';
import { ChannelTypeEnum, EmailProviderIdEnum, IConfigurations, ICredentials } from '@novu/shared';

import { BaseEmailHandler } from './base.handler';

export class SendgridHandler extends BaseEmailHandler {
  constructor() {
    super(EmailProviderIdEnum.SendGrid, ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials & IConfigurations, from?: string) {
    this.provider = new SendgridEmailProvider({
      apiKey: credentials.apiKey,
      from,
      senderName: credentials.senderName,
      ipPoolName: credentials.ipPoolName,
      webhookPublicKey: credentials.inboundWebhookSigningKey,
    });
  }
}
