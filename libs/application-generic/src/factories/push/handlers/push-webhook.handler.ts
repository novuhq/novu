import {
  ChannelTypeEnum,
  ICredentials,
  PushProviderIdEnum,
} from '@novu/shared';
import { PushWebhookPushProvider } from '@novu/providers';
import { BasePushHandler } from './base.handler';

export class PushWebhookHandler extends BasePushHandler {
  constructor() {
    super(PushProviderIdEnum.PushWebhook, ChannelTypeEnum.PUSH);
  }

  buildProvider(credentials: ICredentials) {
    if (!credentials.webhookUrl || !credentials.secretKey) {
      throw Error('Config is not valid for push-webhook provider');
    }

    this.provider = new PushWebhookPushProvider({
      webhookUrl: credentials.webhookUrl,
      hmacSecretKey: credentials.secretKey,
    });
  }
}
