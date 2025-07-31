import { ChatWebhookProvider } from '@novu/providers';
import { ChatProviderIdEnum, ICredentials } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';

import { BaseChatHandler } from './base.handler';

export class ChatWebhookHandler extends BaseChatHandler {
  constructor() {
    super(ChatProviderIdEnum.ChatWebhook, ChannelTypeEnum.CHAT);
  }

  buildProvider(credentials: ICredentials) {
    const config = {
      hmacSecretKey: credentials.secretKey,
    };

    this.provider = new ChatWebhookProvider(config);
  }
}
