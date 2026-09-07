import { MailgunEmailProvider } from '@novu/providers';
import { ChannelTypeEnum, EmailProviderIdEnum, IConfigurations, ICredentials } from '@novu/shared';
import { BaseEmailHandler } from './base.handler';

export class MailgunHandler extends BaseEmailHandler {
  constructor() {
    super(EmailProviderIdEnum.Mailgun, ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials & IConfigurations, from?: string) {
    const config: {
      apiKey: string;
      username: string;
      domain: string;
      from: string;
      baseUrl?: string;
      senderName: string;
      webhookSigningKey?: string;
    } = {
      apiKey: credentials.apiKey,
      username: credentials.user,
      domain: credentials.domain,
      baseUrl: credentials.baseUrl,
      senderName: credentials.senderName,
      webhookSigningKey: credentials.inboundWebhookSigningKey,
      from: from as string,
    };

    this.provider = new MailgunEmailProvider(config);
  }
}
