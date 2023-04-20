import { ChannelTypeEnum } from '@novu/shared';
import { PushWebhookPushProvider } from '@novu/push-webhook';
import { BasePushHandler } from './base.handler';
import { ICredentials } from '@novu/dal';

export class PushWebhookHandler extends BasePushHandler {
  constructor() {
    super('push-webhook', ChannelTypeEnum.PUSH);
  }

  buildProvider(credentials: ICredentials) {
    if (!credentials.apiKey) {
      throw Error('Config is not valid for push-webhook provider');
    }

    this.provider = new PushWebhookPushProvider({
      webhookUrl: credentials.baseUrl,
      hmacSecretKey: credentials.secretKey,
    });
  }
}
