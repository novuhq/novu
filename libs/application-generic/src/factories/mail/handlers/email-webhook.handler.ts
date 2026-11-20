import { EmailWebhookProvider } from '@novu/providers';
import { ChannelTypeEnum, EmailProviderIdEnum, ICredentials } from '@novu/shared';
import { BaseEmailHandler } from './base.handler';

export class EmailWebhookHandler extends BaseEmailHandler {
  constructor() {
    super(EmailProviderIdEnum.EmailWebhook, ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials, from: string) {
    const config: {
      from: string;
      webhookUrl: string;
      hmacSecretKey?: string;
      hmacSecretKeyEncoding?: 'text' | 'base64' | 'hex';
    } = {
      from: credentials.from as string,
      webhookUrl: credentials.webhookUrl as string,
      hmacSecretKey: credentials.secretKey as string,
      hmacSecretKeyEncoding: credentials.hmacSecretKeyEncoding ?? 'text',
    };
    this.provider = new EmailWebhookProvider(config);
  }
}
