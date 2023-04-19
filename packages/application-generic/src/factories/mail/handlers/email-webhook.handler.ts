import { ChannelTypeEnum } from '@novu/shared';
import { EmailWebhookProvider } from '@novu/email-webhook';
import { ICredentials } from '@novu/dal';
import { BaseHandler } from './base.handler';
export class EmailWebhookHandler extends BaseHandler {
  constructor() {
    super('email-webhook', ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials, from: string) {
    const config: {
      from: string;
      webhookUrl: string;
      hmacSecretKey?: string;
    } = {
      from: credentials.from as string,
      webhookUrl: credentials.baseUrl as string,
      hmacSecretKey: credentials.secretKey as string,
    };
    this.provider = new EmailWebhookProvider(config);
  }
}
