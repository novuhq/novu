import { AnypostEmailProvider } from '@novu/providers';
import { ChannelTypeEnum, EmailProviderIdEnum, IConfigurations, ICredentials } from '@novu/shared';
import { BaseEmailHandler } from './base.handler';

export class AnypostHandler extends BaseEmailHandler {
  constructor() {
    super(EmailProviderIdEnum.Anypost, ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials & IConfigurations, from?: string) {
    this.provider = new AnypostEmailProvider({
      from: from as string,
      apiKey: credentials.apiKey as string,
      senderName: credentials.senderName,
      webhookSigningKey: credentials.inboundWebhookSigningKey,
    });
  }
}
